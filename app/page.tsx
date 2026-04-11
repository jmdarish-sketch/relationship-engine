"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

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
  preview: string | null;
}

interface PersonDetail {
  person: PersonSummary & { identity_fingerprint: Record<string, string> };
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

interface OutreachStrategy {
  channel: "linkedin" | "text" | "email";
  rationale: string;
  subject?: string;
  message: string;
  tone: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NAME_SIGNALS = new Set([
  "first_name",
  "last_name",
  "full_name",
  "formal_name",
  "nickname",
]);

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

function personName(p: {
  display_label: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  return (
    p.display_label ??
    ([p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown")
  );
}

function dedupeSignals(
  signals: {
    signal_type: string;
    signal_value: string;
    confidence: number | null;
  }[]
) {
  const map = new Map<string, (typeof signals)[number]>();
  for (const s of signals) {
    if (NAME_SIGNALS.has(s.signal_type)) continue;
    const key = `${s.signal_type}::${s.signal_value.toLowerCase()}`;
    const existing = map.get(key);
    if (!existing || (s.confidence ?? 0) > (existing.confidence ?? 0)) {
      map.set(key, s);
    }
  }
  return Array.from(map.values());
}

function groupByType<T extends { detail_type: string }>(
  items: T[]
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    if (!groups[item.detail_type]) groups[item.detail_type] = [];
    groups[item.detail_type].push(item);
  }
  return groups;
}

const channelStyle: Record<string, { bg: string; text: string }> = {
  linkedin: { bg: "bg-blue-100", text: "text-blue-700" },
  text: { bg: "bg-green-100", text: "text-green-700" },
  email: { bg: "bg-purple-100", text: "text-purple-700" },
};

const channelLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  text: "Text",
  email: "Email",
};

// ---------------------------------------------------------------------------
// Icons (inline SVG)
// ---------------------------------------------------------------------------

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function ChevronLeft({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
    </svg>
  );
}

function ChevronDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [overview, setOverview] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [disambiguationItems, setDisambiguationItems] = useState<
    DisambiguationItem[]
  >([]);
  const [disambiguationOpen, setDisambiguationOpen] = useState(false);

  const [prepResult, setPrepResult] = useState<PrepResult | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [showPrepInput, setShowPrepInput] = useState(false);
  const [prepContext, setPrepContext] = useState("");
  const [prepGoals, setPrepGoals] = useState("");

  const [outreachStrategies, setOutreachStrategies] = useState<
    OutreachStrategy[] | null
  >(null);
  const [outreachLoading, setOutreachLoading] = useState(false);

  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // --- Auth check ---
  useEffect(() => {
    const storedId = localStorage.getItem("user_id");
    if (!storedId) {
      router.push("/login");
      return;
    }
    const stored = localStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored);
      if (!user.onboarding_completed) {
        router.push("/onboarding");
        return;
      }
    }
    setUserId(storedId);
    setAuthChecked(true);
  }, [router]);

  // --- Data fetching ---
  const fetchPeople = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/people?user_id=${userId}`);
    const data = await res.json();
    setPeople(data.people ?? []);
  }, [userId]);

  const fetchDisambiguation = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/disambiguation?user_id=${userId}`);
    if (res.ok) {
      const data = await res.json();
      setDisambiguationItems(data.items ?? []);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchPeople();
      fetchDisambiguation();
    }
  }, [userId, fetchPeople, fetchDisambiguation]);

  // Fetch person detail + overview on selection
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setOverview(null);
      setPrepResult(null);
      setOutreachStrategies(null);
      setShowPrepInput(false);
      setDetailsExpanded(false);
      return;
    }

    setDetailLoading(true);
    setOverview(null);
    setOverviewLoading(true);
    setPrepResult(null);
    setOutreachStrategies(null);
    setShowPrepInput(false);
    setDetailsExpanded(false);

    fetch(`/api/people/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .finally(() => setDetailLoading(false));

    fetch("/api/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, person_id: selectedId }),
    })
      .then((r) => r.json())
      .then((d) => setOverview(d.overview ?? null))
      .finally(() => setOverviewLoading(false));
  }, [selectedId, userId]);

  // --- Actions ---
  function selectPerson(id: string) {
    setSelectedId(id);
    setSearch("");
    setSearchFocused(false);
  }

  async function runPrep() {
    if (!selectedId) return;
    setPrepLoading(true);
    setPrepResult(null);
    const res = await fetch("/api/prep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
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

  async function runOutreach() {
    if (!selectedId) return;
    setOutreachLoading(true);
    setOutreachStrategies(null);
    const res = await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, person_id: selectedId }),
    });
    const data = await res.json();
    setOutreachStrategies(data.strategies ?? null);
    setOutreachLoading(false);
  }

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

  function copyToClipboard(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  // --- Loading state while checking auth ---
  if (!authChecked) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  // --- Derived ---
  const pendingCount = disambiguationItems.filter(
    (i) => i.resolution_status === "pending"
  ).length;

  const filtered = search.trim()
    ? people.filter((p) =>
        personName(p).toLowerCase().includes(search.toLowerCase())
      )
    : people;

  const showDropdown = searchFocused && search.trim().length > 0;

  const peopleLookup = new Map(people.map((p) => [p.id, p]));

  // =========================================================================
  // RENDER — Person Page
  // =========================================================================
  if (selectedId) {
    return (
      <div className="min-h-full bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
          {/* Back */}
          <button
            onClick={() => setSelectedId(null)}
            className="mb-6 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {detailLoading && (
            <div className="flex items-center justify-center py-24 text-zinc-400">
              Loading...
            </div>
          )}

          {detail && !detailLoading && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-3xl font-semibold text-zinc-900">
                  {personName(detail.person)}
                </h1>
                {detail.person.display_label &&
                  detail.person.display_label !==
                    personName({
                      ...detail.person,
                      display_label: null,
                    }) && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {detail.person.display_label}
                    </p>
                  )}
                {detail.identity_signals.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {dedupeSignals(detail.identity_signals).map((s) => (
                      <span
                        key={s.signal_type + s.signal_value}
                        className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600"
                      >
                        {s.signal_value}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Overview Card */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                {overviewLoading ? (
                  <div className="space-y-2.5 animate-pulse">
                    <div className="h-3.5 w-3/4 rounded bg-zinc-100" />
                    <div className="h-3.5 w-full rounded bg-zinc-100" />
                    <div className="h-3.5 w-5/6 rounded bg-zinc-100" />
                    <div className="h-3.5 w-2/3 rounded bg-zinc-100" />
                  </div>
                ) : overview ? (
                  <p className="text-sm leading-relaxed text-zinc-700">
                    {overview}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-400">
                    Not enough data for an overview yet.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 md:flex-row">
                <button
                  onClick={() => {
                    setShowPrepInput(!showPrepInput);
                    if (showPrepInput) {
                      setPrepResult(null);
                      setPrepContext("");
                      setPrepGoals("");
                    }
                  }}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 min-h-12"
                >
                  Prep for meeting
                </button>
                <button
                  onClick={runOutreach}
                  disabled={outreachLoading}
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 min-h-12"
                >
                  {outreachLoading ? "Generating..." : "Outreach strategies"}
                </button>
              </div>

              {/* Prep Input */}
              {showPrepInput && (
                <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                  <input
                    type="text"
                    placeholder="Context (e.g. coffee chat, networking event)"
                    value={prepContext}
                    onChange={(e) => setPrepContext(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Goals (e.g. ask about Centerview, get warm intro)"
                    value={prepGoals}
                    onChange={(e) => setPrepGoals(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runPrep()}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={runPrep}
                    disabled={prepLoading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 min-h-12"
                  >
                    {prepLoading ? "Generating..." : "Generate prep"}
                  </button>
                </div>
              )}

              {/* Prep Result */}
              {prepResult && (
                <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-semibold text-zinc-900">
                      {prepResult.headline}
                    </h3>
                    <button
                      onClick={() => {
                        setPrepResult(null);
                        setPrepContext("");
                        setPrepGoals("");
                        setShowPrepInput(false);
                      }}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Clear
                    </button>
                  </div>

                  <p className="text-sm leading-relaxed text-zinc-600">
                    {prepResult.key_context}
                  </p>

                  {prepResult.talking_points.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Talking Points
                      </h4>
                      <div className="space-y-2">
                        {prepResult.talking_points.map((tp, i) => (
                          <div
                            key={i}
                            className="rounded-lg bg-zinc-50 p-3"
                          >
                            <p className="text-sm font-medium text-zinc-800">
                              {tp.topic}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
                              &ldquo;{tp.opener}&rdquo;
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {tp.why_it_matters}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {prepResult.open_loops.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Open Loops
                      </h4>
                      <div className="space-y-2">
                        {prepResult.open_loops.map((ol, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                          >
                            <p className="text-sm text-amber-800">
                              {ol.description}
                            </p>
                            <p className="mt-1 text-xs text-amber-600">
                              {ol.who_owes_what} &mdash;{" "}
                              {ol.suggested_approach}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {prepResult.tone_guidance && (
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Tone
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {prepResult.tone_guidance}
                      </p>
                    </div>
                  )}

                  {prepResult.cross_conversation_intel.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Intel
                      </h4>
                      <div className="space-y-2">
                        {prepResult.cross_conversation_intel.map((ci, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-blue-200 bg-blue-50 p-3"
                          >
                            <p className="text-sm text-blue-800">
                              {ci.insight}
                            </p>
                            <p className="mt-1 text-xs text-blue-600">
                              {ci.source_context}
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {ci.suggested_use}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Outreach Loading */}
              {outreachLoading && (
                <div className="space-y-3 animate-pulse">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-zinc-200 p-5 space-y-2"
                    >
                      <div className="h-5 w-20 rounded bg-zinc-100" />
                      <div className="h-3 w-full rounded bg-zinc-100" />
                      <div className="h-16 w-full rounded bg-zinc-100" />
                    </div>
                  ))}
                </div>
              )}

              {/* Outreach Strategies */}
              {outreachStrategies && (
                <div className="space-y-3">
                  {outreachStrategies.map((s, i) => {
                    const style = channelStyle[s.channel] ?? {
                      bg: "bg-zinc-100",
                      text: "text-zinc-600",
                    };
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                          >
                            {channelLabels[s.channel] ?? s.channel}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {s.tone}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-zinc-500">
                          {s.rationale}
                        </p>
                        {s.subject && (
                          <p className="text-sm font-medium text-zinc-800">
                            Subject: {s.subject}
                          </p>
                        )}
                        <div className="relative rounded-lg bg-zinc-50 p-3">
                          <p className="pr-16 text-sm leading-relaxed text-zinc-700">
                            {s.message}
                          </p>
                          <button
                            onClick={() => copyToClipboard(s.message, i)}
                            className="absolute right-2 top-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
                          >
                            {copied === i ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Collapsible Details */}
              <div className="border-t border-zinc-100 pt-4">
                <button
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  className="flex w-full items-center justify-between py-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <span className="font-medium">View all details</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${detailsExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {detailsExpanded && (
                  <div className="mt-3 space-y-6">
                    {detail.interactions.length > 0 && (
                      <section>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Interactions
                        </h4>
                        <div className="space-y-2">
                          {detail.interactions.map((inter) => (
                            <div
                              key={inter.id}
                              className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                            >
                              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                                {inter.started_at && (
                                  <span>
                                    {new Date(
                                      inter.started_at
                                    ).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                )}
                                {inter.category && (
                                  <>
                                    <span className="text-zinc-300">
                                      ·
                                    </span>
                                    <span>{inter.category}</span>
                                  </>
                                )}
                              </div>
                              {inter.omi_summary && (
                                <p className="text-sm text-zinc-600">
                                  {inter.omi_summary}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {detail.extracted_details.length > 0 && (
                      <section>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Extracted Details
                        </h4>
                        <div className="space-y-3">
                          {Object.entries(
                            groupByType(detail.extracted_details)
                          ).map(([type, items]) => (
                            <div key={type}>
                              <p className="mb-1 text-xs text-zinc-400 uppercase">
                                {type.replace(/_/g, " ")}
                              </p>
                              <div className="space-y-1">
                                {items.map((d) => (
                                  <div
                                    key={d.id}
                                    className="flex items-start justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
                                  >
                                    <span>{d.content}</span>
                                    {d.importance_score != null && (
                                      <span className="shrink-0 text-xs text-zinc-300">
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

                    {detail.insights.length > 0 && (
                      <section>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Insights
                        </h4>
                        <div className="space-y-1">
                          {detail.insights.map((ins) => (
                            <div
                              key={ins.id}
                              className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
                            >
                              <span className="mr-2 text-xs text-zinc-400">
                                [{ins.insight_type}]
                              </span>
                              {ins.content}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER — Homepage
  // =========================================================================
  return (
    <div className="min-h-full bg-white">
      {/* Disambiguation Banner */}
      {pendingCount > 0 && (
        <div className="border-b border-zinc-100 bg-amber-50">
          <div className="mx-auto max-w-4xl px-4 md:px-6">
            <button
              onClick={() => setDisambiguationOpen(!disambiguationOpen)}
              className="flex w-full items-center justify-between py-2.5 text-sm text-amber-700"
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                {pendingCount}{" "}
                {pendingCount === 1 ? "person needs" : "people need"} identifying
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${disambiguationOpen ? "rotate-180" : ""}`}
              />
            </button>

            {disambiguationOpen && (
              <div className="pb-4 space-y-2">
                {disambiguationItems
                  .filter((i) => i.resolution_status === "pending")
                  .map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-zinc-200 bg-white p-4"
                    >
                      <p className="text-sm font-medium text-zinc-800 mb-1">
                        Who is &quot;{item.detected_name}&quot;?
                      </p>
                      <p className="text-xs text-zinc-400 mb-3 line-clamp-2">
                        {JSON.stringify(item.extracted_context).slice(0, 150)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.candidate_people_ids.map((cid) => {
                          const candidate = peopleLookup.get(cid);
                          return (
                            <button
                              key={cid}
                              onClick={() =>
                                resolveDisambiguation(item.id, cid)
                              }
                              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-blue-400 hover:text-blue-600 min-h-9"
                            >
                              {candidate
                                ? personName(candidate)
                                : cid.slice(0, 8)}
                            </button>
                          );
                        })}
                        <button
                          onClick={() =>
                            resolveDisambiguation(item.id, undefined, true)
                          }
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-emerald-600 transition-colors hover:border-emerald-400 min-h-9"
                        >
                          + Someone new
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-[600px] text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Relationship Engine
          </h1>
          <p className="mt-2 text-base text-zinc-400">
            Remember everyone. Prepare for anything.
          </p>

          {/* Search */}
          <div ref={searchRef} className="relative mt-8">
            <div className="relative">
              <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-300" />
              <input
                type="text"
                placeholder="Search for a person..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className="w-full rounded-lg border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-200 min-h-12"
              />
            </div>

            {/* Search Dropdown */}
            {showDropdown && (
              <div className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                {filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-zinc-400">
                    No one found
                  </div>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => selectPerson(p.id)}
                      className="flex w-full flex-col px-4 py-3 text-left transition-colors hover:bg-zinc-50 border-b border-zinc-50 last:border-0"
                    >
                      <span className="text-sm font-medium text-zinc-800">
                        {personName(p)}
                      </span>
                      {p.preview && (
                        <span className="mt-0.5 text-xs text-zinc-400 line-clamp-1">
                          {p.preview}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Use Case Cards */}
      <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {/* Card 1: Meeting Prep */}
            <div className="rounded-xl border border-zinc-100 bg-white p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                Meeting prep
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Get a personalized briefing before any conversation. Know what to
                talk about, what to follow up on, and what intel you have from
                other conversations.
              </p>
            </div>

            {/* Card 2: Outreach */}
            <div className="rounded-xl border border-zinc-100 bg-white p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <svg
                  className="h-5 w-5 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                Outreach strategies
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Get channel-specific outreach messages — LinkedIn, text, or email
                — that reference real details from your conversations.
              </p>
            </div>

            {/* Card 3: Memory */}
            <div className="rounded-xl border border-zinc-100 bg-white p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                <svg
                  className="h-5 w-5 text-violet-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                Relationship memory
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Every conversation automatically captured, extracted, and
                organized. Never forget what someone told you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
