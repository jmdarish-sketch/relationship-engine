"use client";

import { useState } from "react";
import Link from "next/link";

const INPUT = "w-full rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3 text-[15px] text-[--color-text-primary] placeholder-[--color-text-tertiary] transition-all duration-200 focus:border-[--color-accent] focus:outline-none";
const FOCUS_SHADOW = "0 0 0 3px rgba(59,130,246,0.15)";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSent(true);
  }

  return (
    <div className="relative z-10 min-h-screen">
      {/* ─── NAV ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.16v-1.67a2 2 0 011.632-1.966l.27-.05A9.36 9.36 0 0012 15c1.39 0 2.726-.303 3.927-.846" />
              </svg>
            </div>
            <span className="hidden sm:inline text-[15px] font-semibold text-[--color-text-primary]" style={{ letterSpacing: "-0.01em" }}>Relationship Engine</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline text-[13px] text-[--color-text-tertiary] hover:text-[--color-text-secondary] transition-colors">Log In</Link>
            <Link href="/login" className="rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-all hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Get Started</Link>
          </div>
        </div>
      </header>

      {/* ─── MAIN ───────────────────────────────────────────── */}
      <main className="mx-auto max-w-[640px] px-6 pt-10 pb-16">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[--color-text-tertiary] transition-colors hover:text-[--color-text-secondary]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to home
        </Link>

        {/* Header */}
        <div className="mt-8 text-center">
          <h1 className="text-[36px] sm:text-[44px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.03em" }}>
            Get in touch
          </h1>
          <p className="mx-auto mt-4 max-w-[500px] text-[16px] leading-[1.7] text-[--color-text-secondary]">
            Have questions, feedback, or want to learn more about Relationship Engine? Reach out directly.
          </p>
        </div>

        {/* Contact info card */}
        <div className="mt-10 rounded-2xl bg-[--color-card] p-6 sm:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[--color-accent-surface]">
                <svg className="h-5 w-5 text-[--color-accent]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.05em" }}>Name</p>
                <p className="mt-0.5 text-[15px] font-medium text-[--color-text-primary]">Jacob Darish</p>
              </div>
            </div>

            <div style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />

            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[--color-accent-surface]">
                <svg className="h-5 w-5 text-[--color-accent]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.05em" }}>Email</p>
                <a href="mailto:jmdarish@gmail.com" className="mt-0.5 block text-[15px] font-medium text-[--color-accent] hover:underline">
                  jmdarish@gmail.com
                </a>
              </div>
            </div>

            <div style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />

            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[--color-accent-surface]">
                <svg className="h-5 w-5 text-[--color-accent]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.05em" }}>Phone</p>
                <a href="tel:+16176349997" className="mt-0.5 block text-[15px] font-medium text-[--color-accent] hover:underline">
                  (617) 634-9997
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="mt-10">
          <h2 className="text-[20px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.01em" }}>
            Send a message
          </h2>
          <p className="mt-1 text-[14px] text-[--color-text-secondary]">Fill out the form and we&apos;ll get back to you.</p>

          {sent ? (
            <div className="mt-6 rounded-2xl border border-[--color-accent-light] bg-[--color-accent-surface] p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="mt-3 text-[15px] font-semibold text-[--color-text-primary]">Message sent!</p>
              <p className="mt-1 text-[14px] text-[--color-text-secondary]">We&apos;ll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  placeholder="Your name" className={INPUT} style={{ boxShadow: "none" }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS_SHADOW)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="you@example.com" className={INPUT} style={{ boxShadow: "none" }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS_SHADOW)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Message</label>
                <textarea
                  value={message} onChange={(e) => setMessage(e.target.value)} required rows={5}
                  placeholder="What's on your mind?" className={`${INPUT} resize-none`}
                  style={{ boxShadow: "none", minHeight: "140px" }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS_SHADOW)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
              </div>
              <button
                type="submit"
                className="w-full rounded-full py-3.5 px-6 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
                style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}
              >
                Send message
              </button>
            </form>
          )}
        </div>
      </main>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
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
