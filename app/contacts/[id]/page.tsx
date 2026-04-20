"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePerson, useGenerateInsight } from "@/hooks/useApi";
import Navbar from "@/components/Navbar";
import Skeleton from "@/components/Skeleton";
import type { PrepBrief } from "@/lib/ai/insights";

// Types
interface Interaction { id: string; source: string; summary: string | null; rawTranscript: string | null; interactionDate: string; processingStatus: string; location: string | null; }
interface ExtractedDetail { id: string; category: string; detailKey: string; detailValue: string; confidence: number | null; }
interface IdentitySignal { id: string; signalType: string; signalValue: string; confidence: number; }
interface Insight { id: string; insightType: string; content: string; metadata: unknown; createdAt: string; expiresAt: string | null; }
interface PersonData { id: string; displayName: string; firstName: string | null; lastName: string | null; employer: string | null; userCurrentRole: string | null; school: string | null; email: string | null; phone: string | null; linkedinUrl: string | null; notes: string | null; updatedAt: string; interactions: Interaction[]; extractedDetails: ExtractedDetail[]; identitySignals: IdentitySignal[]; insights: Insight[]; }

// Helpers
function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function hoursUntil(d: string) { return Math.max(0, Math.round((new Date(d).getTime() - Date.now()) / 3600000)); }

const insightBadge: Record<string, { label: string; bg: string; color: string }> = {
  prep_brief: { label: "Prep Brief", bg: "#EFF6FF", color: "#3B82F6" },
  outreach_suggestion: { label: "Outreach", bg: "rgba(34,197,94,0.08)", color: "#22C55E" },
  relationship_summary: { label: "Summary", bg: "rgba(147,51,234,0.08)", color: "#9333EA" },
  follow_up: { label: "Follow-up", bg: "rgba(245,158,11,0.08)", color: "#F59E0B" },
  cross_reference: { label: "Cross-ref", bg: "#F1F5F9", color: "#64748B" },
};

const categoryLabels: Record<string, string> = { career: "Career", education: "Education", personal: "Personal", preference: "Preferences", action_item: "Action Items", relationship: "Relationships" };

const loopStatusConfig: Record<string, { label: string; bg: string; color: string }> = {
  user_owes: { label: "You owe", bg: "rgba(245,158,11,0.1)", color: "#D97706" },
  they_owe: { label: "They owe", bg: "rgba(59,130,246,0.1)", color: "#2563EB" },
  mutual: { label: "Mutual", bg: "rgba(147,51,234,0.1)", color: "#9333EA" },
  dormant: { label: "Dormant", bg: "rgba(113,113,122,0.1)", color: "#71717A" },
};

function tryParsePrep(insight: Insight): PrepBrief | null {
  try {
    const obj = (insight.metadata ?? JSON.parse(insight.content)) as Record<string, unknown>;
    if (obj && typeof obj === "object" && "meeting_purpose" in obj && "open_loops" in obj) {
      return obj as unknown as PrepBrief;
    }
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// PrepBriefCard — structured rendering
// ---------------------------------------------------------------------------

function PrepBriefCard({ brief, insight, onCopy, copied, onRegenerate, regenerating }: {
  brief: PrepBrief;
  insight: Insight;
  onCopy: (text: string, key: string) => void;
  copied: string | null;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [showKnown, setShowKnown] = useState(false);

  return (
    <div className="space-y-3">
      {/* Headline */}
      <div className="rounded-2xl bg-[--color-card] p-6" style={{ boxShadow: "var(--shadow-card)", borderLeft: "3px solid #3B82F6" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: "#EFF6FF", color: "#3B82F6" }}>Prep Brief</span>
          <div className="flex items-center gap-3">
            <button onClick={onRegenerate} disabled={regenerating} className="text-[12px] text-[--color-accent] hover:underline disabled:opacity-50">
              {regenerating ? "Regenerating..." : "Regenerate"}
            </button>
            <button onClick={() => onCopy(JSON.stringify(brief, null, 2), insight.id)} className="text-[12px] text-[--color-text-tertiary] hover:text-[--color-text-secondary] transition-colors">
              {copied === insight.id ? "Copied" : "Copy all"}
            </button>
          </div>
        </div>
        <p className="text-[16px] font-semibold leading-[1.5] text-[--color-text-primary]">{brief.meeting_purpose}</p>
        <p className="mt-3 text-[12px] text-[--color-text-tertiary]">
          Generated {timeAgo(insight.createdAt)}
          {insight.expiresAt && <span className="text-[--color-warning]"> · Expires in {hoursUntil(insight.expiresAt)}h</span>}
        </p>
      </div>

      {/* Since last contact */}
      {brief.since_last_contact && brief.since_last_contact.whats_new_for_them.length > 0 && (
        <div className="rounded-2xl bg-[--color-card] p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.05em" }}>
            Since last contact · {brief.since_last_contact.time_since_last_interaction}
          </p>
          <ul className="mt-3 space-y-1.5">
            {brief.since_last_contact.whats_new_for_them.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] text-[--color-text-primary]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[--color-accent]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What they know about you — collapsible */}
      {brief.what_they_know_about_you && brief.what_they_know_about_you.length > 0 && (
        <div className="rounded-2xl bg-[--color-card] p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <button onClick={() => setShowKnown(!showKnown)} className="flex w-full items-center justify-between">
            <p className="text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.05em" }}>
              What they know about you ({brief.what_they_know_about_you.length})
            </p>
            <svg className={`h-4 w-4 text-[--color-text-tertiary] transition-transform duration-200 ${showKnown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showKnown && (
            <ul className="mt-3 space-y-1.5">
              {brief.what_they_know_about_you.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[--color-text-secondary]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[--color-border]" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Open loops */}
      {brief.open_loops && brief.open_loops.length > 0 && (
        <div className="rounded-2xl bg-[--color-card] p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-[11px] font-semibold uppercase text-[--color-text-tertiary] mb-3" style={{ letterSpacing: "0.05em" }}>
            Open loops
          </p>
          <div className="space-y-3">
            {brief.open_loops.map((loop, i) => {
              const cfg = loopStatusConfig[loop.status] ?? loopStatusConfig.dormant;
              return (
                <div key={i} className="rounded-xl bg-[#FAFAFA] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    <span className="text-[11px] text-[--color-text-tertiary]">{loop.age}</span>
                  </div>
                  <p className="text-[14px] font-medium text-[--color-text-primary]">{loop.thread}</p>
                  <p className="mt-1.5 text-[13px] leading-[1.6] text-[--color-text-secondary]">{loop.suggested_move}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversation hooks */}
      {brief.conversation_hooks && brief.conversation_hooks.length > 0 && (
        <div className="rounded-2xl bg-[--color-card] p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-[11px] font-semibold uppercase text-[--color-text-tertiary] mb-3" style={{ letterSpacing: "0.05em" }}>
            Conversation hooks
          </p>
          <div className="space-y-3">
            {brief.conversation_hooks.map((hook, i) => (
              <div key={i} className="rounded-xl bg-[#FAFAFA] p-4 group">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-medium text-[--color-text-primary] leading-[1.5]">&ldquo;{hook.hook}&rdquo;</p>
                  <button
                    onClick={() => onCopy(hook.hook, `hook-${i}`)}
                    className="shrink-0 text-[11px] text-[--color-text-tertiary] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[--color-text-secondary]"
                  >
                    {copied === `hook-${i}` ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-1.5 text-[12px] text-[--color-accent]">{hook.grounded_in}</p>
                <p className="mt-1 text-[12px] text-[--color-text-tertiary]">{hook.why_it_lands}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watch-outs */}
      {brief.watch_outs && brief.watch_outs.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "rgba(245,158,11,0.05)", boxShadow: "var(--shadow-card)" }}>
          <p className="text-[11px] font-semibold uppercase text-[#D97706] mb-3" style={{ letterSpacing: "0.05em" }}>
            Watch out
          </p>
          <ul className="space-y-1.5">
            {brief.watch_outs.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[--color-text-primary]">
                <span className="mt-1 text-[#D97706]">!</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The ask */}
      {brief.the_ask && brief.the_ask.has_ask && brief.the_ask.what_you_want && (
        <div className="rounded-2xl bg-[--color-card] p-5" style={{ boxShadow: "var(--shadow-card)", borderLeft: "3px solid #10B981" }}>
          <p className="text-[11px] font-semibold uppercase text-[--color-text-tertiary] mb-2" style={{ letterSpacing: "0.05em" }}>
            The ask
          </p>
          <p className="text-[14px] font-medium text-[--color-text-primary]">{brief.the_ask.what_you_want}</p>
          {brief.the_ask.how_to_raise_it && (
            <p className="mt-2 text-[13px] leading-[1.6] text-[--color-text-secondary]">{brief.the_ask.how_to_raise_it}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Old-format brief fallback — shows regenerate button
function StaleInsightCard({ insight, onRegenerate, regenerating }: {
  insight: Insight;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[--color-card] p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: "#EFF6FF", color: "#3B82F6" }}>Prep Brief (outdated)</span>
      </div>
      <p className="text-[14px] text-[--color-text-tertiary]">This brief was generated with an older format. Regenerate for a richer, structured brief.</p>
      <button onClick={onRegenerate} disabled={regenerating}
        className="mt-4 rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-all hover:-translate-y-px disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>
        {regenerating ? "Regenerating..." : "Regenerate prep brief"}
      </button>
    </div>
  );
}

export default function PersonDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { isLoading: authLoading } = useAuth({ redirectTo: "/login" });
  const { data: personRes, isLoading: personLoading } = usePerson(id);
  const generateInsight = useGenerateInsight();

  const [expandedInteraction, setExpandedInteraction] = useState<string | null>(null);
  const [showSignals, setShowSignals] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const person = (personRes?.data ?? null) as PersonData | null;

  function copyText(text: string, key: string) { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); }
  async function handleGenerate(type: string) { if (!id) return; setGenerating(type); try { await generateInsight.mutateAsync({ person_id: id, type }); } catch {} setGenerating(null); }

  // Loading
  if (authLoading || personLoading) {
    return (
      <div className="relative z-10 min-h-full">
        <Navbar backLink={{ href: "/contacts", label: "Contacts" }} />
        <div className="mx-auto max-w-[800px] px-6 py-8 space-y-4">
          <Skeleton width="260px" height="36px" borderRadius="12px" />
          <Skeleton width="180px" height="16px" />
          <div className="mt-6"><Skeleton width="100%" height="80px" borderRadius="16px" /></div>
          <div className="grid grid-cols-3 gap-3 mt-4"><Skeleton height="80px" borderRadius="12px" /><Skeleton height="80px" borderRadius="12px" /><Skeleton height="80px" borderRadius="12px" /></div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="relative z-10 min-h-full">
        <Navbar backLink={{ href: "/contacts", label: "Contacts" }} />
        <div className="mx-auto max-w-[800px] px-6 py-8">
          <h1 className="text-[24px] font-bold text-[--color-text-primary]">Contact not found</h1>
          <p className="mt-2 text-[14px] text-[--color-text-tertiary]">This contact doesn&apos;t exist or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  const subtitleParts: string[] = [];
  if (person.userCurrentRole && person.employer) subtitleParts.push(`${person.userCurrentRole} @ ${person.employer}`);
  else if (person.employer) subtitleParts.push(person.employer);
  else if (person.userCurrentRole) subtitleParts.push(person.userCurrentRole);
  if (person.school) subtitleParts.push(person.school);

  const detailsByCategory: Record<string, ExtractedDetail[]> = {};
  for (const d of person.extractedDetails) { if (!detailsByCategory[d.category]) detailsByCategory[d.category] = []; detailsByCategory[d.category].push(d); }

  return (
    <div className="relative z-10 min-h-full">
      <Navbar backLink={{ href: "/contacts", label: "Contacts" }} />
      <main className="animate-page mx-auto max-w-[800px] px-6 sm:px-6 px-4 py-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>{person.displayName}</h1>
            {subtitleParts.length > 0 && <p className="mt-1 text-[15px] text-[--color-text-secondary]">{subtitleParts.join(" · ")}</p>}
            {(person.email || person.phone || person.linkedinUrl) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {person.email && <a href={`mailto:${person.email}`} className="inline-flex items-center gap-1.5 rounded-full bg-[--color-accent-surface] px-3.5 py-1.5 text-[13px] font-medium text-[--color-accent] transition-colors hover:bg-[rgba(59,130,246,0.12)]"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>{person.email}</a>}
                {person.phone && <a href={`tel:${person.phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-[--color-accent-surface] px-3.5 py-1.5 text-[13px] font-medium text-[--color-accent] transition-colors hover:bg-[rgba(59,130,246,0.12)]"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>{person.phone}</a>}
                {person.linkedinUrl && <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[--color-accent-surface] px-3.5 py-1.5 text-[13px] font-medium text-[--color-accent] transition-colors hover:bg-[rgba(59,130,246,0.12)]">LinkedIn</a>}
              </div>
            )}
          </div>
          <Link href="/contacts/edit" className="shrink-0 text-[13px] text-[--color-text-tertiary] hover:text-[--color-text-secondary] transition-colors">Edit</Link>
        </div>

        {/* Quick Actions */}
        <div className="mb-10 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { type: "prep_brief", label: "Prep for Meeting", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /> },
            { type: "outreach_suggestion", label: "Draft Outreach", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /> },
            { type: "relationship_summary", label: "Relationship Summary", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /> },
          ].map((a) => (
            <button key={a.type} onClick={() => handleGenerate(a.type)} disabled={generating === a.type}
              className="rounded-xl bg-[--color-card] p-5 text-center transition-all duration-200 hover:-translate-y-px hover:bg-[--color-accent-surface] disabled:opacity-50"
              style={{ boxShadow: "var(--shadow-card)" }}
              onMouseEnter={(e) => { if (generating !== a.type) e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}>
              <svg className="mx-auto h-6 w-6 text-[--color-accent]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">{a.icon}</svg>
              <p className="mt-2 text-[14px] font-semibold text-[--color-accent]">
                {generating === a.type ? "Generating..." : a.label}
              </p>
            </button>
          ))}
        </div>

        {/* Insights */}
        <section className="mb-10">
          <div className="mb-4"><h2 className="text-[18px] font-bold text-[--color-text-primary]">Insights</h2><div className="mt-2" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} /></div>
          {person.insights.length === 0 ? (
            <p className="py-6 text-[14px] text-[--color-text-tertiary]">No insights generated yet. Use the actions above to prep for a meeting or draft outreach.</p>
          ) : (
            <div className="space-y-4">
              {person.insights.map((ins) => {
                // Prep brief: structured rendering or stale fallback
                if (ins.insightType === "prep_brief") {
                  const parsed = tryParsePrep(ins);
                  if (parsed) {
                    return <PrepBriefCard key={ins.id} brief={parsed} insight={ins} onCopy={copyText} copied={copied} onRegenerate={() => handleGenerate("prep_brief")} regenerating={generating === "prep_brief"} />;
                  }
                  return <StaleInsightCard key={ins.id} insight={ins} onRegenerate={() => handleGenerate("prep_brief")} regenerating={generating === "prep_brief"} />;
                }

                // Other insight types: default rendering
                const badge = insightBadge[ins.insightType] ?? insightBadge.cross_reference;
                return (
                  <div key={ins.id} className="rounded-2xl bg-[--color-card] p-6" style={{ boxShadow: "var(--shadow-card)" }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                      <button onClick={() => copyText(ins.content, ins.id)} className="text-[12px] text-[--color-text-tertiary] hover:text-[--color-text-secondary] transition-colors">
                        {copied === ins.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="text-[14px] leading-[1.7] text-[--color-text-primary] whitespace-pre-wrap">{ins.content}</div>
                    <p className="mt-4 text-[12px] text-[--color-text-tertiary]">
                      Generated {timeAgo(ins.createdAt)}
                      {ins.expiresAt && <span className="text-[--color-warning]"> · Expires in {hoursUntil(ins.expiresAt)}h</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Conversations */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-[18px] font-bold text-[--color-text-primary]">Conversations</h2>
            {person.interactions.length > 0 && <span className="rounded-full bg-[--color-accent-surface] px-2 py-0.5 font-num text-[11px] font-medium text-[--color-accent]">{person.interactions.length}</span>}
          </div>
          <div style={{ height: "0.5px", background: "var(--color-border-subtle)", marginBottom: "16px" }} />
          {person.interactions.length === 0 ? (
            <p className="py-6 text-[14px] text-[--color-text-tertiary]">No conversations recorded yet.</p>
          ) : (
            <div className="rounded-2xl bg-[--color-card]" style={{ boxShadow: "var(--shadow-card)" }}>
              {person.interactions.map((inter, i) => {
                const isExp = expandedInteraction === inter.id;
                return (
                  <div key={inter.id}>
                    <button onClick={() => setExpandedInteraction(isExp ? null : inter.id)} className="w-full px-5 py-4 text-left transition-colors hover:bg-[rgba(59,130,246,0.03)]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-num text-[12px] text-[--color-text-tertiary]">{fmtDate(inter.interactionDate)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${inter.source === "omi" ? "bg-[--color-accent-surface] text-[--color-accent]" : "bg-[--color-border-subtle] text-[--color-text-secondary]"}`}>{inter.source}</span>
                        {inter.processingStatus !== "completed" && <span className={`h-[7px] w-[7px] rounded-full ${inter.processingStatus === "failed" ? "bg-[--color-danger]" : "bg-[--color-warning]"}`} />}
                      </div>
                      <p className="text-[14px] leading-relaxed text-[--color-text-primary] line-clamp-2">{inter.summary ?? <span className="text-[--color-text-tertiary]">No summary available</span>}</p>
                    </button>
                    {isExp && (
                      <div className="mx-5 mb-4 rounded-xl bg-[#F8FAFC] p-4">
                        {inter.rawTranscript ? (
                          <pre className="font-sans text-[13px] leading-relaxed text-[--color-text-secondary] whitespace-pre-wrap max-h-64 overflow-y-auto">{inter.rawTranscript}</pre>
                        ) : (
                          <p className="text-[13px] text-[--color-text-tertiary]">No transcript available.</p>
                        )}
                      </div>
                    )}
                    {i < person.interactions.length - 1 && <div className="mx-5" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Details */}
        <section className="mb-10">
          <div className="mb-4"><h2 className="text-[18px] font-bold text-[--color-text-primary]">Details</h2><div className="mt-2" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} /></div>
          {person.extractedDetails.length === 0 ? (
            <p className="py-6 text-[14px] text-[--color-text-tertiary]">No details extracted yet. <Link href="/log" className="text-[--color-accent] hover:underline">Log a conversation</Link> to get started.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(detailsByCategory).map(([cat, details]) => (
                <div key={cat} className="rounded-xl bg-[--color-card] p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                  <h3 className="mb-3 text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.05em" }}>{categoryLabels[cat] ?? cat}</h3>
                  <div className="space-y-2">
                    {details.map((d) =>
                      cat === "action_item" ? (
                        <div key={d.id} className="flex items-start gap-2">
                          <div className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border border-[--color-border]" />
                          <span className="text-[14px] text-[--color-text-primary]">{d.detailValue}</span>
                        </div>
                      ) : (
                        <div key={d.id} className="flex items-start justify-between gap-2">
                          <p className="text-[14px]"><span className="font-medium text-[--color-text-secondary]">{d.detailKey}: </span><span className="text-[--color-text-primary]">{d.detailValue}</span></p>
                          {d.confidence != null && <span className="shrink-0 font-num text-[12px] text-[--color-text-tertiary]">{Math.round(d.confidence * 100)}%</span>}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Identity Signals */}
        <section className="mb-16">
          <button onClick={() => setShowSignals(!showSignals)} className="flex items-center gap-1.5 text-[14px] font-semibold text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors">
            <svg className={`h-4 w-4 transition-transform duration-200 ${showSignals ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            Identity Signals ({person.identitySignals.length})
          </button>
          {showSignals && (
            <div className="mt-3 rounded-xl bg-[--color-card] p-4" style={{ boxShadow: "var(--shadow-card)" }}>
              {person.identitySignals.length === 0 ? (
                <p className="text-[13px] text-[--color-text-tertiary]">No signals.</p>
              ) : (
                <div className="space-y-2">
                  {person.identitySignals.map((sig) => (
                    <div key={sig.id} className="flex items-center gap-4 text-[13px]">
                      <span className="min-w-[120px] shrink-0 uppercase text-[12px] text-[--color-text-tertiary]">{sig.signalType}</span>
                      <span className="flex-1 text-[--color-text-primary]">{sig.signalValue}</span>
                      <span className="shrink-0 font-num text-[12px] text-[--color-text-secondary]">{Math.round(sig.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
