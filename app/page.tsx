"use client";

import { useEffect, useState, useCallback } from "react";

const USER_ID = "b56afcb3-4f92-4e9a-9467-3105972f34dd";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersonSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_label: string | null;
  interaction_count: number;
  last_seen: string;
  relationship_strength: string | null;
  evolving_profile: Record<string, unknown>;
}

interface PersonDetail {
  person: PersonSummary & {
    identity_fingerprint: Record<string, string>;
  };
  extracted_details: {
    id: string;
    detail_type: string;
    content: string;
    importance_score: number | null;
    source_quote: string | null;
  }[];
  identity_signals: {
    id: string;
    signal_type: string;
    signal_value: string;
    confidence: number | null;
  }[];
  interactions: {
    id: string;
    started_at: string | null;
    omi_summary: string | null;
    category: string | null;
  }[];
  insights: {
    id: string;
    insight_type: string;
    content: string;
    created_at: string;
  }[];
}

interface DisambiguationItem {
  id: string;
  user_id: string;
  interaction_id: string;
  detected_name: string;
  candidate_people_ids: string[];
  extracted_context: Record<string, unknown>;
  resolution_status: string;
}

interface PrepResult {
  headline: string;
  key_context: string;
  talking_points: { topic: string; opener: string; why_it_matters: string }[];
  open_loops: {
    description: string;
    who_owes_what: string;
    suggested_approach: string;
  }[];
  tone_guidance: string;
  cross_conversation_intel: {
    insight: string;
    source_context: string;
    suggested_use: string;
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function personName(p: { display_label: string | null; first_name: string | null; last_name: string | null }): string {
  return p.display_label ?? ([p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown");
}

// Deduplicate identity signals — keep highest confidence per (type, value)
function dedupeSignals(
  signals: { signal_type: string; signal_value: string; confidence: number | null }[]
): { signal_type: string; signal_value: string; confidence: number | null }[] {
  const map = new Map<string, typeof signals[number]>();
  for (const s of signals) {
    const key = `${s.signal_type}::${s.signal_value.toLowerCase()}`;
    const existing = map.get(key);
    if (!existing || (s.confidence ?? 0) > (existing.confidence ?? 0)) {
      map.set(key, s);
    }
  }
  return Array.from(map.values());
}

// Group extracted details by detail_type
function groupByType<T extends { detail_type: string }>(items: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = item.detail_type;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [disambiguationItems, setDisambiguationItems] = useState<DisambiguationItem[]>([]);
  const [disambiguationPeople, setDisambiguationPeople] = useState<
    Record<string, PersonSummary>
  >({});

  const [prepResult, setPrepResult] = useState<PrepResult | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [showPrepInput, setShowPrepInput] = useState(false);
  const [prepContext, setPrepContext] = useState("");
  const [prepGoals, setPrepGoals] = useState("");

  // Fetch people list
  const fetchPeople = useCallback(async () => {
    const res = await fetch(`/api/people?user_id=${USER_ID}`);
    const data = await res.json();
    setPeople(data.people ?? []);
  }, []);

  // Fetch disambiguation queue
  const fetchDisambiguation = useCallback(async () => {
    // We don't have a dedicated list endpoint, so we'll use supabase client.
    // For simplicity, call the people endpoint to get all people for candidate lookup,
    // and use a lightweight fetch for the queue.
    const res = await fetch(`/api/disambiguation?user_id=${USER_ID}`);
    if (res.ok) {
      const data = await res.json();
      setDisambiguationItems(data.items ?? []);
      // Build a lookup of candidate people
      const lookup: Record<string, PersonSummary> = {};
      for (const p of people) {
        lookup[p.id] = p;
      }
      setDisambiguationPeople(lookup);
    }
  }, [people]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    if (people.length > 0) fetchDisambiguation();
  }, [people, fetchDisambiguation]);

  // Fetch person detail
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setPrepResult(null);
    setShowPrepInput(false);
    fetch(`/api/people/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  // Run prep
  async function runPrep() {
    if (!selectedId) return;
    setPrepLoading(true);
    setPrepResult(null);
    const res = await fetch("/api/prep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        person_id: selectedId,
        context: prepContext || undefined,
        goals: prepGoals || undefined,
      }),
    });
    const data = await res.json();
    setPrepResult(data.prep ?? null);
    setPrepLoading(false);
    setShowPrepInput(false);
  }

  // Resolve disambiguation
  async function resolveDisambiguation(
    queueItemId: string,
    resolvedPersonId?: string,
    createNew?: boolean
  ) {
    await fetch("/api/disambiguation/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queue_item_id: queueItemId,
        resolved_person_id: resolvedPersonId,
        create_new: createNew,
      }),
    });
    fetchDisambiguation();
    fetchPeople();
  }

  const pendingCount = disambiguationItems.filter(
    (i) => i.resolution_status === "pending"
  ).length;

  return (
    <div className="flex h-full">
      {/* ---- Sidebar ---- */}
      <aside className="w-1/3 min-w-[320px] max-w-[420px] border-r border-zinc-800 flex flex-col bg-zinc-950">
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-lg font-semibold tracking-tight">
            Relationship Engine
          </h1>
          {pendingCount > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-amber-400">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              {pendingCount} pending disambiguation{pendingCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {people.length === 0 && (
            <p className="p-4 text-sm text-zinc-500">No people yet.</p>
          )}
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition-colors hover:bg-zinc-900 ${
                selectedId === p.id ? "bg-zinc-900" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate">
                  {personName(p)}
                </span>
                <span className="ml-2 shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {p.interaction_count}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                <span>{timeAgo(p.last_seen)}</span>
                {p.relationship_strength && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span>{p.relationship_strength}</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main className="flex-1 overflow-y-auto">
        {!selectedId && (
          <div className="flex h-full items-center justify-center text-zinc-600">
            <p>Select a person to view their profile</p>
          </div>
        )}

        {selectedId && detailLoading && (
          <div className="flex h-full items-center justify-center text-zinc-600">
            <p>Loading...</p>
          </div>
        )}

        {selectedId && detail && !detailLoading && (
          <div className="max-w-3xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-semibold">
                {personName(detail.person)}
              </h2>
              {detail.person.display_label &&
                detail.person.display_label !==
                  [detail.person.first_name, detail.person.last_name]
                    .filter(Boolean)
                    .join(" ") && (
                  <p className="text-sm text-zinc-500 mt-1">
                    {detail.person.display_label}
                  </p>
                )}
            </div>

            {/* Identity signals as pills */}
            {detail.identity_signals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dedupeSignals(detail.identity_signals).map((s) => (
                  <span
                    key={s.signal_type + s.signal_value}
                    className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                  >
                    {s.signal_value}
                  </span>
                ))}
              </div>
            )}

            {/* Evolving profile */}
            {detail.person.evolving_profile &&
              Object.keys(detail.person.evolving_profile).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Profile
                  </h3>
                  <div className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300 space-y-1">
                    {Object.entries(detail.person.evolving_profile).map(
                      ([k, v]) => (
                        <div key={k}>
                          <span className="text-zinc-500">{k}:</span>{" "}
                          {String(v)}
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}

            {/* Interaction timeline */}
            {detail.interactions.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Interactions
                </h3>
                <div className="space-y-3">
                  {detail.interactions.map((inter) => (
                    <div
                      key={inter.id}
                      className="rounded-lg bg-zinc-900 p-4"
                    >
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                        {inter.started_at && (
                          <span>
                            {new Date(inter.started_at).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                        )}
                        {inter.category && (
                          <>
                            <span className="text-zinc-700">·</span>
                            <span>{inter.category}</span>
                          </>
                        )}
                      </div>
                      {inter.omi_summary && (
                        <p className="text-sm text-zinc-300">
                          {inter.omi_summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Extracted details grouped by type */}
            {detail.extracted_details.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Extracted Details
                </h3>
                <div className="space-y-4">
                  {Object.entries(
                    groupByType(detail.extracted_details)
                  ).map(([type, items]) => (
                    <div key={type}>
                      <h4 className="text-xs font-medium text-zinc-500 mb-2 uppercase">
                        {type.replace(/_/g, " ")}
                      </h4>
                      <div className="space-y-2">
                        {items.map((d) => (
                          <div
                            key={d.id}
                            className="rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-300 flex items-start justify-between gap-3"
                          >
                            <span>{d.content}</span>
                            {d.importance_score != null && (
                              <span className="shrink-0 text-xs text-zinc-600">
                                {(d.importance_score * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Insights */}
            {detail.insights.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Insights
                </h3>
                <div className="space-y-2">
                  {detail.insights.map((ins) => (
                    <div
                      key={ins.id}
                      className="rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
                    >
                      <span className="text-xs text-zinc-500 mr-2">
                        [{ins.insight_type}]
                      </span>
                      {ins.content}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Prep button */}
            <section className="border-t border-zinc-800 pt-6">
              {!showPrepInput && !prepResult && (
                <button
                  onClick={() => setShowPrepInput(true)}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                >
                  Prep me for this conversation
                </button>
              )}

              {showPrepInput && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Context (e.g. coffee chat, networking event, LinkedIn DM follow-up)"
                    value={prepContext}
                    onChange={(e) => setPrepContext(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Goals (e.g. ask about Centerview, get warm intro to David Park)"
                    value={prepGoals}
                    onChange={(e) => setPrepGoals(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runPrep()}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={runPrep}
                      disabled={prepLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                    >
                      {prepLoading ? "Generating..." : "Generate prep"}
                    </button>
                    <button
                      onClick={() => setShowPrepInput(false)}
                      className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {prepLoading && (
                <div className="mt-4 text-sm text-zinc-500">
                  Generating conversation prep...
                </div>
              )}

              {prepResult && <PrepCard prep={prepResult} onReset={() => { setPrepResult(null); setPrepContext(""); setPrepGoals(""); }} />}
            </section>
          </div>
        )}

        {/* ---- Disambiguation Queue ---- */}
        {disambiguationItems.filter((i) => i.resolution_status === "pending")
          .length > 0 && (
          <div className="max-w-3xl mx-auto p-6 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">
              Disambiguation Queue
            </h3>
            <div className="space-y-4">
              {disambiguationItems
                .filter((i) => i.resolution_status === "pending")
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <p className="text-sm font-medium text-zinc-200 mb-1">
                      Who is &quot;{item.detected_name}&quot;?
                    </p>
                    <p className="text-xs text-zinc-500 mb-3">
                      Context:{" "}
                      {JSON.stringify(item.extracted_context).slice(0, 200)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.candidate_people_ids.map((cid) => {
                        const candidate = disambiguationPeople[cid];
                        return (
                          <button
                            key={cid}
                            onClick={() =>
                              resolveDisambiguation(item.id, cid)
                            }
                            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-blue-500 hover:text-blue-400"
                          >
                            {candidate
                              ? personName(candidate)
                              : cid.slice(0, 8)}
                          </button>
                        );
                      })}
                      <button
                        onClick={() =>
                          resolveDisambiguation(
                            item.id,
                            undefined,
                            true
                          )
                        }
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-emerald-400 transition-colors hover:border-emerald-500"
                      >
                        + Someone new
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prep Result Card
// ---------------------------------------------------------------------------

function PrepCard({ prep, onReset }: { prep: PrepResult; onReset: () => void }) {
  return (
    <div className="mt-6 space-y-5 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-zinc-100">
          {prep.headline}
        </h3>
        <button
          onClick={onReset}
          className="text-xs text-zinc-600 hover:text-zinc-400"
        >
          Reset
        </button>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed">
        {prep.key_context}
      </p>

      {prep.talking_points.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Talking Points
          </h4>
          <div className="space-y-3">
            {prep.talking_points.map((tp, i) => (
              <div key={i} className="rounded bg-zinc-800/50 p-3">
                <p className="text-sm font-medium text-zinc-200">
                  {tp.topic}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  &ldquo;{tp.opener}&rdquo;
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  {tp.why_it_matters}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {prep.open_loops.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Open Loops
          </h4>
          <div className="space-y-2">
            {prep.open_loops.map((ol, i) => (
              <div
                key={i}
                className="rounded bg-amber-500/10 border border-amber-500/20 p-3"
              >
                <p className="text-sm text-amber-300">{ol.description}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {ol.who_owes_what} &mdash; {ol.suggested_approach}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {prep.tone_guidance && (
        <div className="rounded bg-zinc-800/50 p-3">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
            Tone
          </h4>
          <p className="text-sm text-zinc-400">{prep.tone_guidance}</p>
        </div>
      )}

      {prep.cross_conversation_intel.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Intel from other conversations
          </h4>
          <div className="space-y-2">
            {prep.cross_conversation_intel.map((ci, i) => (
              <div key={i} className="rounded bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-sm text-blue-300">{ci.insight}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {ci.source_context}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  {ci.suggested_use}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
