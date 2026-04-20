"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Check auth and redirect logged-in users
function useRedirectIfAuth() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) router.push("/dashboard");
      else setChecked(true);
    }).catch(() => setChecked(true));
  }, [router]);
  return checked;
}

// Intersection Observer hook for scroll animations
function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

// FAQ Accordion Item
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-5 text-left">
        <span className="text-[16px] font-semibold text-[--color-text-primary] pr-4">{q}</span>
        <svg className={`h-5 w-5 shrink-0 text-[--color-text-tertiary] transition-transform duration-300 ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? "500px" : "0" }}>
        <p className="pb-5 text-[14px] leading-[1.7] text-[--color-text-secondary]">{a}</p>
      </div>
      <div style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />
    </div>
  );
}

// Section wrapper with scroll-triggered fade
function Section({ children, className = "", id, style }: { children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties }) {
  const ref = { current: null as HTMLElement | null };
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <section ref={(el) => { ref.current = el; }} id={id} style={style}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}>
      {children}
    </section>
  );
}

export default function LandingPage() {
  const ready = useRedirectIfAuth();
  if (!ready) return <div className="min-h-screen bg-[--color-bg]" />;

  return (
    <div className="relative z-10 min-h-screen">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* NAV                                                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50" style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.16v-1.67a2 2 0 011.632-1.966l.27-.05A9.36 9.36 0 0012 15c1.39 0 2.726-.303 3.927-.846" /></svg>
            </div>
            <span className="hidden sm:inline text-[15px] font-semibold text-[--color-text-primary]" style={{ letterSpacing: "-0.01em" }}>Relationship Engine</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline text-[13px] text-[--color-text-tertiary] hover:text-[--color-text-secondary] transition-colors">Log In</Link>
            <Link href="/login" className="rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-all hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Get Started</Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HERO                                                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="relative pt-[120px] pb-20 px-6" style={{ background: "radial-gradient(circle at 50% 30%, rgba(59,130,246,0.05) 0%, transparent 60%)" }}>
        <div className="mx-auto max-w-[700px] text-center">
          <div className="mb-6 inline-block rounded-full bg-[--color-accent-surface] px-4 py-1.5 text-[13px] font-medium text-[--color-accent]" style={{ animationDelay: "0ms" }}>
            Built for ambitious networkers
          </div>
          <h1 className="text-[36px] sm:text-[56px] font-bold text-[--color-text-primary] leading-tight" style={{ letterSpacing: "-0.03em" }}>
            Your Secret Networking Edge
          </h1>
          <p className="mx-auto mt-5 max-w-[600px] text-[18px] leading-[1.7] text-[--color-text-secondary]">
            Every conversation captured. Every detail remembered. Every meeting prepared for. Relationship Engine uses AI to turn your real-world conversations into a personal networking intelligence system.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/login" className="rounded-full px-8 py-4 text-[16px] font-semibold text-white transition-all hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Get Started Free</Link>
            <a href="#how-it-works" className="flex items-center gap-1.5 text-[15px] text-[--color-text-tertiary] transition-colors hover:text-[--color-text-secondary]">
              See How It Works
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </a>
          </div>
        </div>
        {/* Hero visual */}
        <div className="mx-auto mt-12 max-w-[800px]">
          <div className="rounded-2xl bg-[--color-card] p-6 sm:p-8" style={{ boxShadow: "var(--shadow-card-hover)", transform: "perspective(1000px) rotateX(2deg) rotateY(-2deg)" }}>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{ n: "12", l: "Contacts" }, { n: "28", l: "Interactions" }, { n: "3", l: "Pending" }].map((s) => (
                <div key={s.l} className="rounded-xl bg-[--color-bg] p-3 text-center">
                  <p className="font-num text-[20px] font-bold text-[--color-text-primary]">{s.n}</p>
                  <p className="text-[11px] text-[--color-text-tertiary]">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[--color-bg] px-4 py-3">
              <span className="font-num text-[11px] text-[--color-text-tertiary]">Apr 6</span>
              <p className="flex-1 text-[13px] text-[--color-text-primary] truncate">Discussed recruiting at Goldman Sachs Summer Analyst Program</p>
              <span className="rounded-full bg-[--color-accent-surface] px-2.5 py-0.5 text-[11px] font-medium text-[--color-accent]">Zach</span>
              <span className="h-[7px] w-[7px] rounded-full bg-[--color-success]" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TRUST BAR                                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="py-10 text-center">
        <p className="text-[14px] text-[--color-text-tertiary]" style={{ letterSpacing: "0.02em" }}>Built for students who understand the importance of networking</p>
        <p className="mt-2 text-[12px] text-[--color-text-tertiary]">Recruiting · Coffee chats · Career fairs · Networking events</p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section id="how-it-works" className="px-6 pt-20 pb-10">
        <div className="mx-auto max-w-[1080px]">
          <h2 className="text-center text-[28px] sm:text-[36px] font-bold text-[--color-text-primary]">How it works</h2>
          <p className="mt-3 text-center text-[16px] text-[--color-text-secondary]">Three steps to never forget a conversation again</p>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { n: "01", title: "Wear Omi", desc: "Omi is an AI wearable that captures your conversations automatically. Just wear it and talk — no notes, no typing, no effort.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /> },
              { n: "02", title: "AI Does the Work", desc: "Our AI identifies who you talked to, extracts key details — their company, role, interests, action items — and builds a living profile for every contact.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /> },
              { n: "03", title: "Walk In Prepared", desc: "Before your next meeting, get a personalized brief: talking points, open loops to reference, and outreach messages tailored to each person.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /> },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl bg-[--color-card] p-8 text-center transition-all duration-200 hover:-translate-y-1" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">{step.icon}</svg>
                </div>
                <p className="mt-4 font-num text-[13px] text-[--color-text-tertiary]">{step.n}</p>
                <h3 className="mt-1 text-[18px] font-bold text-[--color-text-primary]">{step.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[--color-text-secondary]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FEATURES                                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section className="px-6 pt-20 pb-10">
        <div className="mx-auto max-w-[900px]">
          <h2 className="text-center text-[28px] sm:text-[36px] font-bold text-[--color-text-primary]">Everything you need to network smarter</h2>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[
              { title: "Meeting Prep Briefs", desc: "Get AI-generated talking points, shared interests, and open loops before every meeting. Walk in like you remember everything.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /> },
              { title: "Smart Outreach", desc: "Generate personalized follow-up messages for LinkedIn, email, or text. Reference specific things you discussed — no generic templates.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /> },
              { title: "Total Recall", desc: "Every detail from every conversation — employers, roles, interests, mutual connections — automatically organized and searchable.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /> },
              { title: "Knows Who's Who", desc: "Our AI learns to recognize the people in your network over time. The more you use it, the smarter it gets at connecting conversations to contacts.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" /> },
              { title: "Log Any Conversation", desc: "No Omi? No problem. Manually log coffee chats, phone calls, and networking events. Every detail gets the same AI treatment.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /> },
              { title: "Never Drop the Ball", desc: "Follow-ups, intro requests, and promises are automatically extracted and tracked. You'll always know what you owe and what's owed to you.", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl bg-[--color-card] p-7 transition-all duration-200 hover:-translate-y-1" style={{ boxShadow: "var(--shadow-card)" }}>
                <svg className="h-6 w-6 text-[--color-accent]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">{f.icon}</svg>
                <h3 className="mt-3 text-[16px] font-bold text-[--color-text-primary]">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[--color-text-secondary]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* OMI INTEGRATION                                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section className="py-20 px-6" style={{ background: "#F0F7FF" }}>
        <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-center gap-12 sm:grid-cols-2">
          <div>
            <div className="mb-4 inline-block rounded-full bg-[--color-accent-surface] px-4 py-1.5 text-[13px] font-medium text-[--color-accent]">Powered by Omi</div>
            <h2 className="text-[28px] sm:text-[32px] font-bold text-[--color-text-primary]">Your AI wearable companion</h2>
            <p className="mt-4 text-[16px] leading-[1.7] text-[--color-text-secondary]">
              Omi is an open-source AI wearable pendant that captures conversations throughout your day. Pair it with Relationship Engine and every networking event, coffee chat, and hallway conversation becomes searchable intelligence.
            </p>
            <div className="mt-6 space-y-3">
              {["Captures conversations automatically", "Syncs in real-time via webhook", "Open-source and privacy-respecting", "Works with any conversation, anywhere"].map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <svg className="h-5 w-5 shrink-0 text-[--color-accent]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  <span className="text-[14px] text-[--color-text-primary]">{t}</span>
                </div>
              ))}
            </div>
            <a href="https://www.omi.me" target="_blank" rel="noopener noreferrer" className="mt-6 inline-block text-[14px] font-medium text-[--color-accent] hover:underline">Learn more about Omi →</a>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-2 border-dashed border-[--color-border]">
              <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
              </div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="absolute rounded-full border border-[--color-accent]/20" style={{ width: `${120 + i * 40}px`, height: `${120 + i * 40}px`, opacity: 0.3 - i * 0.08 }} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PRICING                                                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section className="px-6 pt-20 pb-10">
        <div className="mx-auto max-w-[700px]">
          <h2 className="text-center text-[28px] sm:text-[36px] font-bold text-[--color-text-primary]">Simple pricing</h2>
          <p className="mt-3 text-center text-[16px] text-[--color-text-secondary]">Free while we&apos;re in beta. Pro features coming soon.</p>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl bg-[--color-card] p-8" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="rounded-full bg-[--color-accent-surface] px-3 py-1 text-[11px] font-medium text-[--color-accent]">Current</span>
              <h3 className="mt-4 text-[24px] font-bold text-[--color-text-primary]">Free</h3>
              <p className="mt-1"><span className="font-num text-[40px] font-bold text-[--color-text-primary]">$0</span><span className="text-[16px] text-[--color-text-secondary]">/month</span></p>
              <div className="mt-6 space-y-3">
                {["Unlimited contacts", "Omi device integration", "AI meeting prep briefs", "Smart outreach generation", "Conversation history", "Manual conversation logging"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-[--color-success]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    <span className="text-[14px] text-[--color-text-primary]">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" className="mt-8 flex w-full items-center justify-center rounded-full py-3 text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Get Started</Link>
            </div>
            {/* Pro */}
            <div className="rounded-2xl bg-[--color-card] p-8 opacity-70" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="rounded-full bg-[--color-border-subtle] px-3 py-1 text-[11px] font-medium text-[--color-text-tertiary]">Coming Soon</span>
              <h3 className="mt-4 text-[24px] font-bold text-[--color-text-tertiary]">Pro</h3>
              <p className="mt-1"><span className="font-num text-[40px] font-bold text-[--color-text-tertiary]">TBD</span></p>
              <p className="mt-1 text-[14px] text-[--color-text-tertiary]">Everything in Free, plus:</p>
              <div className="mt-4 space-y-3">
                {["Advanced analytics & insights", "CRM integrations", "Team collaboration", "Priority AI processing", "Export & API access"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-[--color-text-tertiary]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    <span className="text-[14px] text-[--color-text-tertiary]">{f}</span>
                  </div>
                ))}
              </div>
              <button disabled className="mt-8 w-full rounded-full border border-[--color-border] py-3 text-[14px] font-medium text-[--color-text-tertiary] cursor-not-allowed">Join Waitlist</button>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FAQ                                                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section className="px-6 pt-20 pb-10">
        <div className="mx-auto max-w-[700px]">
          <h2 className="text-center text-[28px] sm:text-[36px] font-bold text-[--color-text-primary]">Frequently asked questions</h2>
          <div className="mt-12">
            <FaqItem q="What is Omi?" a="Omi is an open-source AI wearable pendant that captures your conversations throughout the day. It's a small, lightweight device you wear that automatically transcribes conversations and sends them to Relationship Engine for processing. You can learn more at omi.me." />
            <FaqItem q="Is my data private?" a="Yes. Your conversations and contact data are only accessible to you. We use encrypted connections, and your data is never shared with other users or third parties. You can delete your data at any time." />
            <FaqItem q="Do I need an Omi device to use Relationship Engine?" a="No! While Omi integration is a key feature, you can also manually log conversations through our app. Every manually logged conversation gets the same AI-powered extraction and insight generation." />
            <FaqItem q="How does the AI identify people?" a="Our AI builds identity fingerprints for each contact over time using signals like names, employers, roles, and schools mentioned in conversations. The more conversations you have, the more accurately it identifies speakers." />
            <FaqItem q="What happens when the AI isn't sure who someone is?" a="When our speaker identification confidence is between 30-80%, the conversation goes to your review queue. You'll see the context from the conversation and can quickly confirm which contact it belongs to or create a new one." />
            <FaqItem q="Is Relationship Engine free?" a="Yes! Relationship Engine is currently free while we're in beta. We're working on Pro features that will be available as a paid tier in the future, but the core functionality will always have a free option." />
            <FaqItem q="Who is this designed for?" a="Relationship Engine is built for students who understand the importance of networking — whether you're recruiting for banking, consulting, tech, or any competitive field. It works for anyone who has conversations worth remembering: students, alumni, and professionals alike." />
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FINAL CTA                                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6" style={{ background: "#F0F7FF" }}>
        <div className="mx-auto max-w-[600px] text-center">
          <h2 className="text-[28px] sm:text-[32px] font-bold text-[--color-text-primary]">Ready to never forget a conversation again?</h2>
          <p className="mt-3 text-[16px] text-[--color-text-secondary]">Join the beta and start building your networking intelligence.</p>
          <Link href="/login" className="mt-8 inline-block rounded-full px-8 py-4 text-[16px] font-semibold text-white transition-all hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Get Started Free</Link>
          <p className="mt-3 text-[13px] text-[--color-text-tertiary]">No credit card required</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <footer className="py-12 px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="text-[14px] text-[--color-text-secondary]">Relationship Engine</span>
          <div className="flex items-center gap-6 text-[13px] text-[--color-text-tertiary]">
            <Link href="/login" className="hover:text-[--color-text-secondary] transition-colors">Log In</Link>
            <Link href="/privacy" className="hover:text-[--color-text-secondary] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[--color-text-secondary] transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-[--color-text-secondary] transition-colors">Contact</Link>
          </div>
        </div>
        <p className="mt-6 text-center text-[12px] text-[--color-text-tertiary]">© 2026 Relationship Engine. All rights reserved.</p>
      </footer>
    </div>
  );
}
