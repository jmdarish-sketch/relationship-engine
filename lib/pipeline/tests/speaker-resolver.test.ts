import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveSpeakers,
  scoreCandidate,
  buildDisplayLabel,
} from "../speaker-resolver";
import type { SpeakerExtracted } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mock Supabase — table-aware mock that handles chained queries
// ---------------------------------------------------------------------------

type MockRow = Record<string, unknown>;

interface TableMock {
  selectData: MockRow[] | MockRow | null;
  insertData: MockRow | null;
  onInsert?: (rows: unknown) => void;
}

function createMockSupabase(tables: Record<string, TableMock>) {
  function makeChain(tableName: string) {
    const tbl = tables[tableName] ?? {
      selectData: null,
      insertData: null,
    };

    const terminalSelect = {
      data: Array.isArray(tbl.selectData) ? tbl.selectData : null,
      error: null,
    };
    const terminalSingle = {
      data: Array.isArray(tbl.selectData)
        ? tbl.selectData[0] ?? null
        : tbl.selectData,
      error: null,
    };
    const terminalInsert = { data: null, error: null };

    // Build a deeply chainable object where any method returns itself
    // except terminal methods (single, or, ilike) which resolve.
    const chain: Record<string, unknown> = {};
    const self = () => chain;

    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.not = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.ilike = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);

    // .or() is terminal for findCandidates people query
    chain.or = vi.fn().mockResolvedValue(terminalSelect);

    // .single() is terminal
    chain.single = vi.fn().mockResolvedValue(terminalSingle);

    // .insert() chains to .select().single() for createNewPerson
    chain.insert = vi.fn().mockImplementation((rows: unknown) => {
      tbl.onInsert?.(rows);
      return {
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({
              data: tbl.insertData ?? { id: "generated-id" },
              error: null,
            }),
        }),
        // bare insert (no .select) resolves
        then: (resolve: (v: unknown) => void) =>
          resolve(terminalInsert),
      };
    });

    // .update() chains
    chain.update = vi.fn().mockReturnValue(chain);

    // Make chain thenable for bare awaits
    chain.then = (resolve: (v: unknown) => void) =>
      resolve(terminalSelect);

    return chain;
  }

  const supabase = {
    from: vi.fn().mockImplementation((table: string) => makeChain(table)),
  };

  return supabase;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = "user-001";
const INTERACTION_ID = "interaction-001";

function makeSpeaker(
  overrides: Partial<SpeakerExtracted> = {}
): SpeakerExtracted {
  return {
    speaker_id: "SPEAKER_01",
    detected_name: "Sarah",
    identity_signals: [
      {
        signal_type: "employer",
        signal_value: "Goldman Sachs",
        confidence: 0.9,
        source_quote: "I work at Goldman",
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Unit tests: scoreCandidate
// ---------------------------------------------------------------------------

describe("scoreCandidate", () => {
  it("returns 0.2 for null fingerprint", () => {
    expect(scoreCandidate(null, [])).toBe(0.2);
  });

  it("returns 0.2 for empty fingerprint", () => {
    expect(scoreCandidate({}, [])).toBe(0.2);
  });

  it("returns 0.15 when no signal types overlap", () => {
    const fingerprint = { employer: "Goldman Sachs" };
    const signals = [
      {
        signal_type: "school",
        signal_value: "NYU",
        confidence: 0.9,
        source_quote: "",
      },
    ];
    expect(scoreCandidate(fingerprint, signals)).toBe(0.15);
  });

  it("returns high score for matching signals", () => {
    const fingerprint = { employer: "Goldman Sachs", role: "Analyst" };
    const signals = [
      {
        signal_type: "employer",
        signal_value: "Goldman Sachs",
        confidence: 0.9,
        source_quote: "",
      },
      {
        signal_type: "role",
        signal_value: "Analyst",
        confidence: 0.8,
        source_quote: "",
      },
    ];
    expect(scoreCandidate(fingerprint, signals)).toBeGreaterThan(0.8);
  });

  it("penalizes contradictions", () => {
    const fingerprint = { employer: "Goldman Sachs" };
    const signals = [
      {
        signal_type: "employer",
        signal_value: "Morgan Stanley",
        confidence: 0.9,
        source_quote: "",
      },
    ];
    expect(scoreCandidate(fingerprint, signals)).toBe(0);
  });

  it("handles substring matches", () => {
    const fingerprint = { employer: "Goldman Sachs" };
    const signals = [
      {
        signal_type: "employer",
        signal_value: "Goldman",
        confidence: 0.9,
        source_quote: "",
      },
    ];
    expect(scoreCandidate(fingerprint, signals)).toBeGreaterThan(0.8);
  });

  it("skips name signals during scoring", () => {
    const fingerprint = { first_name: "Sarah", employer: "Goldman Sachs" };
    const signals = [
      {
        signal_type: "first_name",
        signal_value: "Sarah",
        confidence: 1.0,
        source_quote: "",
      },
      {
        signal_type: "employer",
        signal_value: "Morgan Stanley",
        confidence: 0.9,
        source_quote: "",
      },
    ];
    // first_name is skipped, employer contradicts → score = 0
    expect(scoreCandidate(fingerprint, signals)).toBe(0);
  });

  it("mixes matches and contradictions on stable signals", () => {
    const fingerprint = { employer: "Goldman Sachs", school: "Harvard" };
    const signals = [
      {
        signal_type: "employer",
        signal_value: "Goldman Sachs",
        confidence: 0.9,
        source_quote: "",
      },
      {
        signal_type: "school",
        signal_value: "MIT",
        confidence: 0.8,
        source_quote: "",
      },
    ];
    const score = scoreCandidate(fingerprint, signals);
    // Both stable (weight=2 each). match=1.8, contra=1.6, total=4
    // 1.8/4 - (1.6/4)*0.5 = 0.45 - 0.2 = 0.25
    expect(score).toBeCloseTo(0.25, 1);
  });

  it("does not penalize volatile signal mismatches", () => {
    const fingerprint = { employer: "Evercore", role: "Leading recruiting for TMT group" };
    const signals = [
      {
        signal_type: "employer",
        signal_value: "Evercore",
        confidence: 0.9,
        source_quote: "",
      },
      {
        signal_type: "role",
        signal_value: "TMT analyst recruiter",
        confidence: 0.8,
        source_quote: "",
      },
    ];
    const score = scoreCandidate(fingerprint, signals);
    // employer (stable w=2): exact match → 2*0.9=1.8
    // role (volatile w=1): "tmt" word overlap → partial match, NOT a contradiction
    // Should score well above 0.5 since employer is a strong match
    expect(score).toBeGreaterThan(0.5);
  });

  it("creates contradiction only for stable signal mismatches", () => {
    const fingerprint = { employer: "Goldman Sachs", role: "M&A analyst" };
    const signals = [
      {
        signal_type: "employer",
        signal_value: "Morgan Stanley",
        confidence: 0.9,
        source_quote: "",
      },
      {
        signal_type: "role",
        signal_value: "Sales and trading",
        confidence: 0.8,
        source_quote: "",
      },
    ];
    const score = scoreCandidate(fingerprint, signals);
    // employer (stable): contradiction → penalty. role (volatile): no overlap, ignored.
    expect(score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Unit tests: buildDisplayLabel
// ---------------------------------------------------------------------------

describe("buildDisplayLabel", () => {
  it("uses full name + employer", () => {
    const label = buildDisplayLabel("Zach", "Williams", [
      { signal_type: "employer", signal_value: "Evercore", confidence: 0.9 },
    ]);
    expect(label).toBe("Zach Williams — Evercore");
  });

  it("uses first name only when no last name or context", () => {
    const label = buildDisplayLabel("Zach", null, []);
    expect(label).toBe("Zach");
  });

  it("falls back to formal_name signal", () => {
    const label = buildDisplayLabel(null, null, [
      {
        signal_type: "formal_name",
        signal_value: "Mr. Thompson",
        confidence: 0.9,
      },
      {
        signal_type: "employer",
        signal_value: "Goldman Sachs",
        confidence: 0.8,
      },
    ]);
    expect(label).toBe("Mr. Thompson — Goldman Sachs");
  });

  it("prefers employer over school", () => {
    const label = buildDisplayLabel("Sarah", "Chen", [
      { signal_type: "school", signal_value: "Harvard", confidence: 0.9 },
      { signal_type: "employer", signal_value: "Lazard", confidence: 0.7 },
    ]);
    expect(label).toBe("Sarah Chen — Lazard");
  });

  it("uses school when no employer", () => {
    const label = buildDisplayLabel("Mike", null, [
      { signal_type: "school", signal_value: "Ross", confidence: 0.8 },
    ]);
    expect(label).toBe("Mike — Ross");
  });

  it("uses full_name signal as fallback", () => {
    const label = buildDisplayLabel(null, null, [
      {
        signal_type: "full_name",
        signal_value: "David Park",
        confidence: 0.9,
      },
      { signal_type: "employer", signal_value: "Moelis", confidence: 0.8 },
    ]);
    expect(label).toBe("David Park — Moelis");
  });
});

// ---------------------------------------------------------------------------
// Integration tests: resolveSpeakers with mock Supabase
// ---------------------------------------------------------------------------

describe("resolveSpeakers", () => {
  it("creates a new person when no candidates exist", async () => {
    const speaker = makeSpeaker();
    const newPersonId = "new-person-abc";

    const mock = createMockSupabase({
      people: {
        selectData: [], // findCandidates returns empty
        insertData: { id: newPersonId },
      },
      identity_signals: {
        selectData: [], // signal search returns nothing
        insertData: null,
      },
      interaction_people: { selectData: null, insertData: null },
    });

    const results = await resolveSpeakers(
      mock as unknown as Parameters<typeof resolveSpeakers>[0],
      USER_ID,
      INTERACTION_ID,
      [speaker]
    );

    expect(results).toHaveLength(1);
    expect(results[0].resolution).toBe("created");
    expect(results[0].person_id).toBe(newPersonId);
    expect(results[0].confidence).toBe(1.0);
  });

  it("matches an existing person with high confidence (>0.8)", async () => {
    const speaker = makeSpeaker({
      identity_signals: [
        {
          signal_type: "employer",
          signal_value: "Goldman Sachs",
          confidence: 0.95,
          source_quote: "I'm at Goldman",
        },
        {
          signal_type: "role",
          signal_value: "VP",
          confidence: 0.9,
          source_quote: "just made VP",
        },
      ],
    });

    const existingPersonId = "existing-person-123";

    const mock = createMockSupabase({
      people: {
        selectData: [
          {
            id: existingPersonId,
            first_name: "Sarah",
            last_name: "Chen",
            display_label: "Sarah Chen",
            identity_fingerprint: {
              employer: "Goldman Sachs",
              role: "VP",
            },
            evolving_profile: {},
            interaction_count: 3,
          },
        ],
        insertData: null,
      },
      identity_signals: {
        selectData: [],
        insertData: null,
      },
      interaction_people: { selectData: null, insertData: null },
    });

    const results = await resolveSpeakers(
      mock as unknown as Parameters<typeof resolveSpeakers>[0],
      USER_ID,
      INTERACTION_ID,
      [speaker]
    );

    expect(results).toHaveLength(1);
    expect(results[0].resolution).toBe("matched");
    expect(results[0].person_id).toBe(existingPersonId);
    expect(results[0].confidence).toBeGreaterThan(0.8);
  });

  it("adds to disambiguation queue when confidence is ambiguous (0.3–0.8)", async () => {
    const speaker = makeSpeaker({
      identity_signals: [
        {
          signal_type: "employer",
          signal_value: "Goldman Sachs",
          confidence: 0.9,
          source_quote: "I'm at Goldman",
        },
        {
          signal_type: "role",
          signal_value: "Analyst",
          confidence: 0.7,
          source_quote: "I'm an analyst",
        },
        {
          signal_type: "school",
          signal_value: "MIT",
          confidence: 0.8,
          source_quote: "went to MIT",
        },
      ],
    });

    const candidateId = "candidate-456";
    let disambiguationInserted = false;

    const mock = createMockSupabase({
      people: {
        selectData: [
          {
            id: candidateId,
            first_name: "Sarah",
            last_name: null,
            display_label: "Sarah",
            identity_fingerprint: {
              employer: "Goldman Sachs",
              role: "Analyst",
              school: "Harvard",
            },
            evolving_profile: {},
          },
        ],
        insertData: null,
      },
      identity_signals: { selectData: [], insertData: null },
      interaction_people: { selectData: null, insertData: null },
      disambiguation_queue: {
        selectData: null,
        insertData: null,
        onInsert: () => {
          disambiguationInserted = true;
        },
      },
    });

    const results = await resolveSpeakers(
      mock as unknown as Parameters<typeof resolveSpeakers>[0],
      USER_ID,
      INTERACTION_ID,
      [speaker]
    );

    expect(results).toHaveLength(1);
    expect(results[0].resolution).toBe("ambiguous");
    expect(results[0].person_id).toBe(candidateId);
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.3);
    expect(results[0].confidence).toBeLessThanOrEqual(0.8);
    expect(disambiguationInserted).toBe(true);
  });
});
