"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { SkeletonCard, SkeletonRow } from "@/components/Skeleton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InteractionRow {
  id: string;
  summary: string | null;
  interactionDate: string;
  processingStatus: string;
  people: { id: string; displayName: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFullDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function first(name: string | undefined) {
  return name?.split(" ")[0] ?? "";
}

const statusDot: Record<string, string> = {
  completed: "bg-[--color-success]",
  processing: "bg-[--color-warning]",
  pending: "bg-[--color-warning]",
  failed: "bg-[--color-danger]",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  const { user, isLoading } = useAuth({ redirectTo: "/login" });

  const [totalPeople, setTotalPeople] = useState<number | null>(null);
  const [totalInteractions, setTotalInteractions] = useState<number | null>(null);
  const [pendingDisambiguation, setPendingDisambiguation] = useState<number | null>(null);
  const [recentInteractions, setRecentInteractions] = useState<InteractionRow[]>([]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const [ppl, int, dis, rec] = await Promise.all([
        api.get<{ meta?: { total: number } }>("/api/people?limit=1"),
        api.get<{ meta?: { total: number } }>("/api/interactions?limit=1"),
        api.get<{ data: unknown[] }>("/api/disambiguation"),
        api.get<{ data: InteractionRow[] }>("/api/interactions?sort=date&limit=5"),
      ]);
      setTotalPeople(ppl.meta?.total ?? 0);
      setTotalInteractions(int.meta?.total ?? 0);
      setPendingDisambiguation(dis.data?.length ?? 0);
      setRecentInteractions(rec.data ?? []);
    } catch {}
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="relative z-10 min-h-full">
        <Navbar />
        <main className="mx-auto max-w-[1080px] px-6 pt-8 pb-8">
          <div className="h-8 w-64 rounded-lg skeleton-shimmer mb-2" style={{ background: "#E2E8F0" }} />
          <div className="h-4 w-40 rounded skeleton-shimmer mb-7" style={{ background: "#E2E8F0" }} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </main>
      </div>
    );
  }

  const pending = pendingDisambiguation ?? 0;

  return (
    <div className="relative z-10 min-h-full">
      <Navbar />
      <main className="animate-page mx-auto max-w-[1080px] px-6 sm:px-6 px-4 pt-8 pb-8">
        {/* Greeting */}
        <h1 className="text-[26px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>
          Welcome back, {first(user?.fullName)}
        </h1>
        <p className="mt-1 text-[14px] text-[--color-text-secondary] mb-7">
          {fmtFullDate()}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          <Link href="/contacts" className="group rounded-2xl bg-[--color-card] p-5 transition-all duration-200 hover:-translate-y-0.5" style={{ boxShadow: "var(--shadow-card)" }} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-card-hover)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-card)")}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-num text-[32px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>
                  {totalPeople ?? "—"}
                </p>
                <p className="mt-0.5 text-[13px] text-[--color-text-secondary]">Contacts</p>
              </div>
              <svg className="h-[18px] w-[18px] text-[--color-text-tertiary]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.16v-1.67a2 2 0 011.632-1.966l.27-.05A9.36 9.36 0 0012 15c1.39 0 2.726-.303 3.927-.846" />
              </svg>
            </div>
          </Link>

          <Link href="/contacts" className="group rounded-2xl bg-[--color-card] p-5 transition-all duration-200 hover:-translate-y-0.5" style={{ boxShadow: "var(--shadow-card)" }} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-card-hover)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-card)")}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-num text-[32px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>
                  {totalInteractions ?? "—"}
                </p>
                <p className="mt-0.5 text-[13px] text-[--color-text-secondary]">Interactions</p>
              </div>
              <svg className="h-[18px] w-[18px] text-[--color-text-tertiary]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
          </Link>

          <Link href="/review" className="group rounded-2xl bg-[--color-card] p-5 transition-all duration-200 hover:-translate-y-0.5" style={{ boxShadow: "var(--shadow-card)" }} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-card-hover)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-card)")}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-num text-[32px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>
                    {pendingDisambiguation ?? "—"}
                  </p>
                  {pending > 0 && (
                    <span className="h-2 w-2 rounded-full bg-[--color-accent] animate-pulse-blue" />
                  )}
                </div>
                <p className="mt-0.5 text-[13px] text-[--color-text-secondary]">Pending Review</p>
              </div>
              <svg className="h-[18px] w-[18px] text-[--color-text-tertiary]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-8">
          <Link
            href="/contacts"
            className="flex flex-[2] items-center justify-center gap-2 rounded-full py-3.5 px-6 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
            style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.4)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-button)")}
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Search Contacts
          </Link>
          <Link
            href="/contacts/edit"
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[--color-border] bg-[--color-card] py-3.5 px-6 text-[14px] font-medium text-[--color-text-primary] transition-all duration-200 hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
          >
            <svg className="h-4 w-4 text-[--color-text-secondary]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit Contacts
          </Link>
        </div>

        {/* Recent Activity */}
        <section>
          <h2 className="mb-4 text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.08em" }}>
            Recent activity
          </h2>

          <div className="rounded-2xl bg-[--color-card]" style={{ boxShadow: "var(--shadow-card)" }}>
            {recentInteractions.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-[--color-text-tertiary]">
                No interactions yet. Connect your Omi device or add a conversation manually.
              </p>
            ) : (
              recentInteractions.map((inter, i) => (
                <div key={inter.id}>
                  <div className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[rgba(59,130,246,0.03)] cursor-pointer">
                    <span className="font-num w-14 shrink-0 text-[12px] text-[--color-text-tertiary]">
                      {fmtDate(inter.interactionDate)}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[14px] text-[--color-text-primary]">
                      {inter.processingStatus === "pending"
                        ? "Processing..."
                        : inter.summary
                          ? inter.summary.slice(0, 120) + (inter.summary.length > 120 ? "..." : "")
                          : "No summary"}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {inter.people.slice(0, 2).map((p) => (
                        <span key={p.id} className="rounded-full bg-[--color-accent-surface] px-2.5 py-0.5 text-[11px] font-medium text-[--color-accent]">
                          {p.displayName}
                        </span>
                      ))}
                      <span className={`h-[7px] w-[7px] rounded-full ${statusDot[inter.processingStatus] ?? "bg-[--color-text-tertiary]"}`} />
                    </div>
                  </div>
                  {i < recentInteractions.length - 1 && (
                    <div className="mx-5" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Bottom Buttons */}
        <div className="mt-6 flex flex-col gap-2.5 pb-8">
          <Link
            href="/review"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[--color-border] bg-[--color-card] py-3 px-6 text-[14px] font-medium text-[--color-text-primary] transition-all duration-200 hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
          >
            <svg className="h-4 w-4 text-[--color-text-secondary]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            Review Pending Matches
            {pending > 0 && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
                {pending}
              </span>
            )}
          </Link>
          <Link
            href="/log"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[--color-border] bg-[--color-card] py-3 px-6 text-[14px] font-medium text-[--color-text-primary] transition-all duration-200 hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
          >
            <svg className="h-4 w-4 text-[--color-text-secondary]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Manually Log a Conversation
          </Link>
        </div>
      </main>
    </div>
  );
}
