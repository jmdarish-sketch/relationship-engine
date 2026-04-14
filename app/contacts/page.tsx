"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface PersonSummary {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  employer: string | null;
  school: string | null;
  userCurrentRole: string | null;
  _count?: { interactionPeople: number };
}

export default function ContactsPage() {
  const { user, isLoading: authLoading } = useAuth({ redirectTo: "/login" });
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const fetchPeople = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<{ data: PersonSummary[] }>("/api/people?limit=100&sort=name");
      setPeople(res.data ?? []);
    } catch {}
  }, [user]);

  useEffect(() => { fetchPeople(); }, [fetchPeople]);

  const filtered = search.trim()
    ? people.filter((p) => p.displayName.toLowerCase().includes(search.toLowerCase()))
    : [];
  const showResults = focused && search.trim().length > 0;

  if (authLoading) {
    return <div className="relative z-10 flex min-h-full items-center justify-center"><p className="text-[13px] text-[--color-text-tertiary]">Loading...</p></div>;
  }

  function first(n: string | undefined) { return n?.split(" ")[0] ?? ""; }

  return (
    <div className="relative z-10 min-h-full">
      <Navbar backLink={{ href: "/dashboard", label: "Home" }} />
      <main className="animate-page mx-auto max-w-[1080px] px-6 sm:px-6 px-4 py-6">

        {/* Search */}
        <div ref={searchRef} className="relative mb-7">
          <div className="flex items-center gap-3 rounded-full bg-[--color-card] px-6 py-4 transition-all duration-200"
            style={{ boxShadow: focused ? "0 0 0 3px rgba(59,130,246,0.15), 0 6px 24px rgba(0,0,0,0.06)" : "var(--shadow-card)" }}>
            <svg className={`h-5 w-5 transition-colors duration-200 ${focused ? "text-[--color-accent]" : "text-[--color-text-tertiary]"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => setFocused(true)}
              placeholder="Search for a person..."
              className="flex-1 border-none bg-transparent text-[16px] text-[--color-text-primary] placeholder-[--color-text-tertiary] outline-none" />
          </div>

          {showResults && (
            <div className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl bg-[--color-card]" style={{ boxShadow: "var(--shadow-card-hover)" }}>
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center text-[14px] text-[--color-text-tertiary]">No contacts found</div>
              ) : (
                filtered.map((p, i) => {
                  const detail = [p.employer, p.school, p.userCurrentRole].filter(Boolean).join(" · ");
                  return (
                    <div key={p.id}>
                      <Link href={`/contacts/${p.id}`} onMouseDown={(e) => e.preventDefault()} onClick={() => setFocused(false)}
                        className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[rgba(59,130,246,0.03)]">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-[--color-text-primary]">{p.displayName}</p>
                          {detail && <p className="mt-0.5 text-[13px] text-[--color-text-secondary] truncate">{detail}</p>}
                        </div>
                        {p._count && (
                          <span className="shrink-0 rounded-full bg-[--color-accent-surface] px-2.5 py-0.5 font-num text-[11px] font-medium text-[--color-accent]">
                            {p._count.interactionPeople}
                          </span>
                        )}
                      </Link>
                      {i < filtered.length - 1 && <div className="mx-5" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />,
              title: "Meeting Prep", desc: "Get a personalized briefing before any conversation with talking points and intel." },
            { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />,
              title: "Outreach", desc: "Draft ready-to-send messages for LinkedIn, text, or email that reference real details." },
            { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />,
              title: "Relationship Memory", desc: "Every conversation automatically captured, extracted, and organized." },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl bg-[--color-card] p-6 transition-all duration-200 hover:-translate-y-0.5 cursor-default"
              style={{ boxShadow: "var(--shadow-card)" }} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-card-hover)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-card)")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[--color-accent-surface]">
                <svg className="h-5 w-5 text-[--color-accent]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">{card.icon}</svg>
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[--color-text-primary]">{card.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[--color-text-secondary]">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* All Contacts */}
        {people.length > 0 && !search.trim() && (
          <section>
            <h2 className="mb-4 text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.08em" }}>
              All contacts <span className="font-num">{people.length}</span>
            </h2>
            <div className="rounded-2xl bg-[--color-card]" style={{ boxShadow: "var(--shadow-card)" }}>
              {people.map((p, i) => {
                const detail = [p.employer, p.school, p.userCurrentRole].filter(Boolean).join(" · ");
                return (
                  <div key={p.id}>
                    <Link href={`/contacts/${p.id}`} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[rgba(59,130,246,0.03)]">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-[--color-text-primary]">{p.displayName}</p>
                        {detail && <p className="mt-0.5 text-[13px] text-[--color-text-secondary] truncate">{detail}</p>}
                      </div>
                      {p._count && (
                        <span className="shrink-0 rounded-full bg-[--color-accent-surface] px-2.5 py-0.5 font-num text-[11px] font-medium text-[--color-accent]">
                          {p._count.interactionPeople} conversations
                        </span>
                      )}
                    </Link>
                    {i < people.length - 1 && <div className="mx-5" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
