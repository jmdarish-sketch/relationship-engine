import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="relative z-10 min-h-screen">
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

      <main className="mx-auto max-w-[640px] px-6 pt-10 pb-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[--color-text-tertiary] transition-colors hover:text-[--color-text-secondary]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to home
        </Link>

        <div className="mt-16 text-center">
          <h1 className="text-[36px] sm:text-[44px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.03em" }}>
            Terms of Service
          </h1>
          <p className="mt-4 text-[16px] text-[--color-text-secondary]">Coming soon</p>
        </div>
      </main>

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
