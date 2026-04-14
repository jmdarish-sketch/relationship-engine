"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user =
        mode === "login"
          ? await login(email, password)
          : await signup(email, password, name);
      if (!user.onboardingCompleted) router.push("/onboarding");
      else router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4"
      style={{ background: "radial-gradient(circle at 50% 40%, rgba(59,130,246,0.05) 0%, transparent 60%)" }}>

      {/* Card */}
      <div className="w-full max-w-[440px] rounded-2xl bg-[--color-card] px-10 py-10 md:px-10 md:py-10"
        style={{ boxShadow: "var(--shadow-card)" }}>

        {/* Logo */}
        <div className="mb-1 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.16v-1.67a2 2 0 011.632-1.966l.27-.05A9.36 9.36 0 0012 15c1.39 0 2.726-.303 3.927-.846" />
            </svg>
          </div>
          <span className="text-[17px] font-semibold text-[--color-text-primary]">Relationship Engine</span>
        </div>
        <p className="mb-8 text-center text-[14px] text-[--color-text-secondary]">
          Remember everyone. Prepare for anything.
        </p>

        {/* Toggle */}
        <div className="mb-6 flex rounded-full bg-[#F1F5F9] p-1">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className="flex-1 rounded-full py-2.5 text-center text-[14px] font-medium transition-all duration-200"
            style={mode === "login" ? { background: "linear-gradient(135deg, #3B82F6, #2563EB)", color: "white" } : { color: "#64748B" }}
          >Sign in</button>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className="flex-1 rounded-full py-2.5 text-center text-[14px] font-medium transition-all duration-200"
            style={mode === "signup" ? { background: "linear-gradient(135deg, #3B82F6, #2563EB)", color: "white" } : { color: "#64748B" }}
          >Create account</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Full name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="w-full rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3 text-[15px] text-[--color-text-primary] placeholder-[--color-text-tertiary] transition-all duration-200 focus:border-[--color-accent] focus:outline-none" style={{ boxShadow: "none" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
              className="w-full rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3 text-[15px] text-[--color-text-primary] placeholder-[--color-text-tertiary] transition-all duration-200 focus:border-[--color-accent] focus:outline-none" style={{ boxShadow: "none" }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)")}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" required
                className="w-full rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3 pr-11 text-[15px] text-[--color-text-primary] placeholder-[--color-text-tertiary] transition-all duration-200 focus:border-[--color-accent] focus:outline-none" style={{ boxShadow: "none" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-text-tertiary] hover:text-[--color-text-secondary] transition-colors">
                {showPw ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-semibold text-white transition-all duration-200 disabled:pointer-events-none disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>
            {loading
              ? mode === "login" ? "Signing in..." : "Creating account..."
              : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-xl px-4 py-3 text-[13px] text-[--color-danger]"
            style={{ background: "rgba(239,68,68,0.08)" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
