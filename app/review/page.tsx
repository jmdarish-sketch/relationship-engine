"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDisambiguationQueue, useResolveDisambiguation } from "@/hooks/useApi";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Candidate { id: string; displayName: string; fingerprint: Record<string, string[]> | null; }
interface DisambiguationItem { id: string; speakerLabel: string; candidatePersonIds: string[]; identitySignalsSnapshot: Record<string, string[]>; status: string; createdAt: string; interaction: { id: string; interactionDate: string; summary: string | null }; candidatePeople: Candidate[]; }

const signalStyle: Record<string, { bg: string; label: string; labelColor: string }> = {
  names: { bg: "rgba(147,51,234,0.08)", label: "NAME", labelColor: "#9333EA" },
  employers: { bg: "#EFF6FF", label: "EMPLOYER", labelColor: "#3B82F6" },
  schools: { bg: "rgba(34,197,94,0.08)", label: "SCHOOL", labelColor: "#22C55E" },
  roles: { bg: "rgba(245,158,11,0.08)", label: "ROLE", labelColor: "#F59E0B" },
  interests: { bg: "#F1F5F9", label: "TOPIC", labelColor: "#64748B" },
  locations: { bg: "#F1F5F9", label: "LOCATION", labelColor: "#64748B" },
};

function fmtDate(d: string) { const x = new Date(d); return x.toLocaleDateString("en-US", { month: "long", day: "numeric" }) + " at " + x.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function estConf(snap: Record<string, string[]>, c: Candidate) { const fp = c.fingerprint; if (!fp) return 0.2; let m = 0, t = 0; for (const [k, vs] of Object.entries(snap)) { if (!Array.isArray(vs)) continue; const cv = fp[k]; if (!Array.isArray(cv)) continue; for (const v of vs) { t++; if (cv.some((x) => x.toLowerCase() === v.toLowerCase())) m++; } } return t === 0 ? 0.3 : Math.round((0.3 + 0.7 * (m / t)) * 100) / 100; }

const INPUT = "w-full rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3 text-[15px] text-[--color-text-primary] placeholder-[--color-text-tertiary] transition-all duration-200 focus:border-[--color-accent] focus:outline-none";
const FOCUS = "0 0 0 3px rgba(59,130,246,0.15)";

export default function ReviewPage() {
  const { isLoading: authLoading } = useAuth({ redirectTo: "/login" });
  const { data: queueRes, isLoading: queueLoading } = useDisambiguationQueue();
  const resolve = useResolveDisambiguation();
  const items = (queueRes?.data ?? []) as unknown as DisambiguationItem[];

  const [idx, setIdx] = useState(0); const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false); const [resolved, setResolved] = useState(0); const [trans, setTrans] = useState(false);
  const [nf, setNf] = useState(""); const [nl, setNl] = useState(""); const [ne, setNe] = useState(""); const [ns, setNs] = useState(""); const [nr, setNr] = useState("");

  const current = items[idx] as DisambiguationItem | undefined;
  const allDone = !current && !queueLoading && resolved > 0;

  function prefill(s: Record<string, string[]>) { const n = s.names?.[0] ?? ""; setNf(n.split(/\s+/)[0] ?? ""); setNl(n.includes(" ") ? n.split(/\s+/).slice(1).join(" ") : ""); setNe(s.employers?.[0] ?? ""); setNs(s.schools?.[0] ?? ""); setNr(s.roles?.[0] ?? ""); }
  const sorted = useMemo(() => { if (!current) return []; return [...current.candidatePeople].sort((a, b) => estConf(current.identitySignalsSnapshot, b) - estConf(current.identitySignalsSnapshot, a)); }, [current]);

  function advance() { setTrans(true); setSelectedId(null); setShowNew(false); setResolved((c) => c + 1); setTimeout(() => { setIdx((i) => i + 1); setTrans(false); }, 300); }
  async function handleResolve() { if (!current || !selectedId) return; await resolve.mutateAsync({ id: current.id, action: "resolve", resolved_person_id: selectedId }); advance(); }
  async function handleNew() { if (!current) return; const name = [nf, nl].filter(Boolean).join(" "); await resolve.mutateAsync({ id: current.id, action: "create_new", person_data: { first_name: nf || undefined, last_name: nl || undefined, employer: ne || undefined, school: ns || undefined, display_name: ne ? `${name} — ${ne}` : ns ? `${name} — ${ns}` : name || undefined } }); advance(); }
  async function handleSkip() { if (!current) return; await resolve.mutateAsync({ id: current.id, action: "skip" }); advance(); }

  function first(n: string | undefined) { return n?.split(" ")[0] ?? ""; }
  function inp(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={INPUT} style={{ boxShadow: "none" }} onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS)} onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />; }

  if (authLoading || queueLoading) return <div className="relative z-10 flex min-h-full items-center justify-center"><p className="text-[13px] text-[--color-text-tertiary]">Loading...</p></div>;

  // Completion / empty
  if (allDone || (items.length === 0 && resolved > 0) || items.length === 0) {
    const isDone = resolved > 0;
    return (
      <div className="relative z-10 min-h-full">
        <Navbar backLink={{ href: "/dashboard", label: "Home" }} />
        <div className="animate-page flex flex-col items-center justify-center px-4 pt-20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </div>
          <h2 className="mt-5 text-[24px] font-bold text-[--color-text-primary]">{isDone ? "Nice!" : "All caught up!"}</h2>
          <p className="mt-2 text-[14px] text-[--color-text-secondary]">{isDone ? `${resolved} conversation${resolved === 1 ? "" : "s"} matched to contacts.` : "No conversations need review."}</p>
          <Link href="/dashboard" className="mt-6 rounded-full px-8 py-3 text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Back to Home</Link>
        </div>
      </div>
    );
  }

  // Signals
  const badges: { key: string; value: string; bg: string; label: string; labelColor: string }[] = [];
  if (current) for (const [k, vs] of Object.entries(current.identitySignalsSnapshot)) { if (!Array.isArray(vs)) continue; const s = signalStyle[k] ?? signalStyle.interests; for (const v of vs) badges.push({ key: k, value: v, ...s }); }

  return (
    <div className="relative z-10 min-h-full">
      <Navbar backLink={{ href: "/dashboard", label: "Home" }} />
      <main className="animate-page mx-auto max-w-[560px] px-6 sm:px-6 px-4 py-6">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>Review Matches</h1>
          <span className="font-num text-[14px] text-[--color-text-secondary]">{idx + 1} of {items.length}</span>
        </div>

        {current && (
          <div className={`transition-all duration-300 ${trans ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
            {/* Card */}
            <div className="rounded-2xl bg-[--color-card] p-8" style={{ boxShadow: "var(--shadow-card)" }}>
              {/* Context */}
              <p className="text-[15px] text-[--color-text-primary] mb-4">
                During a conversation on <span className="font-semibold">{fmtDate(current.interaction.interactionDate)}</span>, someone mentioned:
              </p>
              <div className="flex flex-wrap gap-2 mb-7">
                {badges.map((b, i) => (
                  <div key={i} className="rounded-xl px-3.5 py-2" style={{ background: b.bg }}>
                    <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.05em", color: b.labelColor }}>{b.label}</p>
                    <p className="text-[14px] font-semibold text-[--color-text-primary]">{b.value}</p>
                  </div>
                ))}
              </div>

              {/* Candidates */}
              <h3 className="text-[16px] font-bold text-[--color-text-primary] mb-4">Who is this?</h3>
              {sorted.length > 0 && (
                <div className="space-y-2.5 mb-4">
                  {sorted.map((c) => {
                    const conf = estConf(current.identitySignalsSnapshot, c);
                    const sel = selectedId === c.id;
                    return (
                      <button key={c.id} onClick={() => { setSelectedId(sel ? null : c.id); setShowNew(false); }}
                        className="w-full rounded-xl p-4 text-left transition-all duration-200"
                        style={{ border: sel ? "2px solid #3B82F6" : "1.5px solid #E2E8F0", background: sel ? "#EFF6FF" : "#FFFFFF" }}
                        onMouseEnter={(e) => { if (!sel) { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.background = "#FAFBFE"; } }}
                        onMouseLeave={(e) => { if (!sel) { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#FFFFFF"; } }}>
                        <div className="flex items-center justify-between">
                          <p className="text-[15px] font-semibold text-[--color-text-primary]">{c.displayName}</p>
                          <span className={`rounded-full px-2.5 py-0.5 font-num text-[11px] font-medium ${conf >= 0.7 ? "text-[--color-success]" : conf >= 0.4 ? "text-[--color-warning]" : "text-[--color-text-secondary]"}`}
                            style={{ background: conf >= 0.7 ? "rgba(34,197,94,0.08)" : conf >= 0.4 ? "rgba(245,158,11,0.08)" : "#F1F5F9" }}>
                            {Math.round(conf * 100)}%
                          </span>
                        </div>
                        {c.fingerprint && <p className="mt-1 text-[13px] text-[--color-text-secondary]">{[...(c.fingerprint.employers ?? []), ...(c.fingerprint.schools ?? []), ...(c.fingerprint.roles ?? [])].slice(0, 3).join(" · ") || "No details"}</p>}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedId && (
                <button onClick={handleResolve} disabled={resolve.isPending}
                  className="flex w-full items-center justify-center rounded-full py-3 text-[15px] font-semibold text-white transition-all disabled:opacity-60 mb-2"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>
                  {resolve.isPending ? "Linking..." : "Confirm"}
                </button>
              )}

              {/* Create new */}
              <div className="my-6" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />
              {!showNew ? (
                <button onClick={() => { setShowNew(true); setSelectedId(null); prefill(current.identitySignalsSnapshot); }} className="text-[14px] text-[--color-text-secondary] hover:text-[--color-accent] transition-colors">
                  Don&apos;t recognize them? Create a new contact
                </button>
              ) : (
                <div className="rounded-xl p-5 space-y-3 mt-3" style={{ background: "#F0F7FF" }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-[12px] text-[--color-text-tertiary]">First Name</label>{inp({ value: nf, onChange: (e) => setNf(e.target.value) })}</div>
                    <div><label className="mb-1 block text-[12px] text-[--color-text-tertiary]">Last Name</label>{inp({ value: nl, onChange: (e) => setNl(e.target.value) })}</div>
                  </div>
                  <div><label className="mb-1 block text-[12px] text-[--color-text-tertiary]">Company</label>{inp({ value: ne, onChange: (e) => setNe(e.target.value) })}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-[12px] text-[--color-text-tertiary]">School</label>{inp({ value: ns, onChange: (e) => setNs(e.target.value) })}</div>
                    <div><label className="mb-1 block text-[12px] text-[--color-text-tertiary]">Role</label>{inp({ value: nr, onChange: (e) => setNr(e.target.value) })}</div>
                  </div>
                  <button onClick={handleNew} disabled={resolve.isPending || !nf.trim()}
                    className="flex w-full items-center justify-center rounded-full py-3 mt-2 text-[15px] font-semibold text-white transition-all disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>
                    {resolve.isPending ? "Creating..." : "Create & Link"}
                  </button>
                </div>
              )}

              {/* Skip */}
              <div className="mt-5 text-center">
                <button onClick={handleSkip} disabled={resolve.isPending} className="text-[13px] text-[--color-text-tertiary] hover:text-[--color-text-secondary] transition-colors">Skip for now</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
