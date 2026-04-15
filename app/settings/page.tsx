"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";

const CAREER_SUGGESTIONS = ["Investment Banking","Consulting","Private Equity","Venture Capital","Tech","Startups","Real Estate","Law","Medicine"];
const INTEREST_SUGGESTIONS = ["Golf","Basketball","Travel","Reading","Cooking","Fitness","Music","Gaming","Hiking","Photography"];
const SKILL_SUGGESTIONS = ["Financial Modeling","Python","Data Analysis","Public Speaking","Design","Marketing","Sales","Writing","Leadership","Research"];

const INPUT = "w-full rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3 text-[15px] text-[--color-text-primary] placeholder-[--color-text-tertiary] transition-all duration-200 focus:border-[--color-accent] focus:outline-none";
const FOCUS_SHADOW = "0 0 0 3px rgba(59,130,246,0.15)";

const BTN_PRIMARY = "rounded-full px-6 py-2.5 text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-px disabled:opacity-60 disabled:pointer-events-none";
const BTN_PRIMARY_STYLE = { background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" } as const;
const BTN_SECONDARY = "rounded-full border border-[--color-border] bg-[--color-card] px-4 py-2 text-[13px] font-medium text-[--color-text-primary] transition-all duration-200 hover:bg-[#F8FAFC] hover:border-[#CBD5E1]";

interface ProfileData {
  school: string | null;
  graduation_year: number | null;
  major: string | null;
  current_role: string | null;
  career_interests: string[];
  networking_goals: string | null;
  personal_interests: string[];
  skills: string[];
}

interface UserProfileResponse {
  data: {
    id: string;
    email: string;
    full_name: string;
    profile_data: ProfileData | null;
    profile_summary: string | null;
    onboarding_completed: boolean;
    omi_api_key: string | null;
    omi_api_key_masked: string | null;
    omi_api_key_has_value: boolean;
  };
}

// ---------------------------------------------------------------------------
// TagInput
// ---------------------------------------------------------------------------

function TagInput({ tags, setTags, suggestions, placeholder }: {
  tags: string[]; setTags: (t: string[]) => void; suggestions: string[]; placeholder: string;
}) {
  const [input, setInput] = useState("");
  function add(t: string) { const v = t.trim(); if (v && !tags.includes(v)) setTags([...tags, v]); setInput(""); }
  function remove(t: string) { setTags(tags.filter((x) => x !== t)); }
  const unused = suggestions.filter((s) => !tags.includes(s));

  return (
    <div className="space-y-3">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[--color-accent-surface] px-2.5 py-1 text-[11px] font-medium text-[--color-accent]">
              {t}
              <button type="button" onClick={() => remove(t)} className="ml-0.5 opacity-60 hover:opacity-100">&times;</button>
            </span>
          ))}
        </div>
      )}
      <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
        placeholder={placeholder} className={INPUT} style={{ boxShadow: "none" }}
        onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS_SHADOW)}
        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="rounded-full border border-[--color-border] px-2.5 py-1 text-[11px] text-[--color-text-tertiary] transition-colors hover:border-[--color-accent-light] hover:text-[--color-text-secondary]">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">{label}</label>
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={INPUT} style={{ boxShadow: "none" }}
    onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS_SHADOW)}
    onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />;
}

function Toast({ message, kind }: { message: string; kind: "success" | "error" }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-[13px] font-medium text-white"
      style={{ background: kind === "success" ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #EF4444, #DC2626)", boxShadow: "var(--shadow-button)" }}>
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth({ redirectTo: "/login" });

  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  // User identity
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  // Profile fields
  const [school, setSchool] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [major, setMajor] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [networkingGoals, setNetworkingGoals] = useState("");
  const [personalInterests, setPersonalInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  // Fallback state (profile_data null but profile_summary exists)
  const [fallbackSummary, setFallbackSummary] = useState<string | null>(null);

  // Omi
  const [omiKey, setOmiKey] = useState("");
  const [omiKeyMasked, setOmiKeyMasked] = useState("");
  const [omiKeyDirty, setOmiKeyDirty] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const webhookUrl = userId ? `https://relationship-engine-ten.vercel.app/api/webhook/omi?uid=${userId}` : "";

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await api.get<UserProfileResponse>("/api/user/profile");
        const u = res.data;
        setUserId(u.id);
        setEmail(u.email);
        setFullName(u.full_name ?? "");

        const pd = u.profile_data;
        if (pd) {
          setSchool(pd.school ?? "");
          setGradYear(pd.graduation_year ? String(pd.graduation_year) : "");
          setMajor(pd.major ?? "");
          setCurrentRole(pd.current_role ?? "");
          setCareerInterests(pd.career_interests ?? []);
          setNetworkingGoals(pd.networking_goals ?? "");
          setPersonalInterests(pd.personal_interests ?? []);
          setSkills(pd.skills ?? []);
          setFallbackSummary(null);
        } else if (u.profile_summary) {
          setFallbackSummary(u.profile_summary);
        }

        setOmiKeyMasked(u.omi_api_key_masked ?? "");
        setOmiKey(""); // not dirty
        setOmiKeyDirty(false);
      } catch {} finally {
        setLoaded(true);
      }
    })();
  }, [user]);

  function showToast(msg: string, kind: "success" | "error" = "success") {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await api.post("/api/profile", {
        full_name: fullName || undefined,
        school: school || null,
        graduation_year: gradYear ? parseInt(gradYear) : null,
        major: major || null,
        current_role: currentRole || null,
        career_interests: careerInterests,
        networking_goals: networkingGoals || null,
        personal_interests: personalInterests,
        skills,
      });
      setFallbackSummary(null);
      showToast("Profile saved");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveOmiKey() {
    setSavingKey(true);
    try {
      const payload = omiKeyDirty ? (omiKey || null) : undefined;
      if (payload === undefined) {
        showToast("No changes");
        setSavingKey(false);
        return;
      }
      await api.put("/api/user/profile", { omi_api_key: payload });
      // Refetch to get the new masked value
      const res = await api.get<UserProfileResponse>("/api/user/profile");
      setOmiKeyMasked(res.data.omi_api_key_masked ?? "");
      setOmiKey("");
      setOmiKeyDirty(false);
      setShowKey(false);
      showToast("Omi key saved");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save", "error");
    } finally {
      setSavingKey(false);
    }
  }

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function changePassword() {
    if (newPw !== confirmPw) {
      showToast("New passwords don't match", "error");
      return;
    }
    if (newPw.length < 8) {
      showToast("New password must be at least 8 characters", "error");
      return;
    }
    setChangingPw(true);
    try {
      await api.post("/api/auth/change-password", {
        current_password: currentPw,
        new_password: newPw,
      });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      showToast("Password changed");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to change password", "error");
    } finally {
      setChangingPw(false);
    }
  }

  if (isLoading || !loaded) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="text-[13px] text-[--color-text-tertiary]">Loading...</p>
      </div>
    );
  }

  // What to show in Omi key input
  const omiDisplay = omiKeyDirty
    ? (showKey ? omiKey : "•".repeat(Math.min(omiKey.length, 24)))
    : (showKey ? "" : omiKeyMasked);

  return (
    <div className="relative z-10 min-h-screen bg-white">
      <main className="animate-page mx-auto max-w-[640px] px-6 pt-10 pb-16">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-[--color-text-tertiary] transition-colors hover:text-[--color-text-secondary]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to dashboard
        </button>

        <h1 className="text-[28px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>
          Settings
        </h1>
        <p className="mt-1 text-[14px] text-[--color-text-secondary]">Manage your profile, device, and account</p>

        {/* ── Section 1: Profile ─────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.08em" }}>
            Profile
          </h2>
          <p className="mt-1 mb-5 text-[13px] text-[--color-text-tertiary]">
            Saving regenerates your profile summary used by the AI.
          </p>

          {fallbackSummary && (
            <div className="mb-6 rounded-xl border border-[--color-border] bg-[#F8FAFC] p-4">
              <p className="text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.05em" }}>
                Current profile summary
              </p>
              <p className="mt-2 text-[13px] text-[--color-text-secondary]" style={{ lineHeight: 1.55 }}>
                {fallbackSummary}
              </p>
              <p className="mt-3 text-[12px] text-[--color-text-tertiary]">
                Re-enter your profile details below to enable editing.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Field label="Full name"><TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
            <Field label="Email">
              <input type="email" value={email} readOnly className={`${INPUT} bg-[#F8FAFC]`} style={{ boxShadow: "none" }} />
            </Field>
            <Field label="School"><TextInput value={school} onChange={(e) => setSchool(e.target.value)} placeholder="e.g. University of Michigan" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Graduation year"><TextInput type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="2026" /></Field>
              <Field label="Major"><TextInput value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Finance" /></Field>
            </div>
            <Field label="Current role"><TextInput value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="e.g. Senior at Ross" /></Field>
            <Field label="Career interests">
              <TagInput tags={careerInterests} setTags={setCareerInterests} suggestions={CAREER_SUGGESTIONS} placeholder="Type and press Enter" />
            </Field>
            <Field label="Networking goals">
              <textarea value={networkingGoals} onChange={(e) => setNetworkingGoals(e.target.value)}
                placeholder="What are you trying to accomplish with your network?"
                rows={3} className={`${INPUT} resize-none`} style={{ boxShadow: "none", minHeight: "88px" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS_SHADOW)}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
            </Field>
            <Field label="Personal interests">
              <TagInput tags={personalInterests} setTags={setPersonalInterests} suggestions={INTEREST_SUGGESTIONS} placeholder="Type and press Enter" />
            </Field>
            <Field label="Skills">
              <TagInput tags={skills} setTags={setSkills} suggestions={SKILL_SUGGESTIONS} placeholder="Type and press Enter" />
            </Field>
          </div>

          <div className="mt-5 flex justify-end">
            <button onClick={saveProfile} disabled={savingProfile} className={BTN_PRIMARY} style={BTN_PRIMARY_STYLE}>
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </div>
        </section>

        <div className="my-10" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />

        {/* ── Section 2: Omi Connection ──────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.08em" }}>
            Omi Connection
          </h2>
          <p className="mt-1 mb-5 text-[13px] text-[--color-text-tertiary]">
            Connect your Omi device so conversations flow into Relationship Engine.
          </p>

          <ol className="mb-5 space-y-2 text-[13px] text-[--color-text-secondary]">
            <li><span className="font-medium text-[--color-text-primary]">1.</span> Open the Omi app → Settings → Developer Settings.</li>
            <li><span className="font-medium text-[--color-text-primary]">2.</span> Create a Developer API key and paste it below.</li>
            <li><span className="font-medium text-[--color-text-primary]">3.</span> Under Webhooks, enable Conversation Events and paste the webhook URL below.</li>
          </ol>

          <Field label="Omi API key">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={omiDisplay}
                  onChange={(e) => { setOmiKeyDirty(true); setOmiKey(e.target.value); setShowKey(true); }}
                  onFocus={(e) => { if (!omiKeyDirty) { setOmiKey(""); setShowKey(true); } e.currentTarget.style.boxShadow = FOCUS_SHADOW; }}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                  placeholder={omiKeyMasked ? "Enter a new key to replace" : "Paste your Omi API key"}
                  className={INPUT}
                  style={{ boxShadow: "none", paddingRight: "72px" }}
                />
                {omiKeyDirty && (
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[--color-accent] hover:opacity-80"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                )}
              </div>
              <button onClick={saveOmiKey} disabled={savingKey || !omiKeyDirty} className={BTN_PRIMARY} style={BTN_PRIMARY_STYLE}>
                {savingKey ? "Saving..." : "Save"}
              </button>
            </div>
          </Field>

          <div className="mt-4">
            <Field label="Webhook URL">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className={`${INPUT} bg-[#F8FAFC] text-[13px]`}
                  style={{ boxShadow: "none" }}
                />
                <button onClick={copyWebhook} className={BTN_SECONDARY}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </Field>
          </div>
        </section>

        <div className="my-10" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />

        {/* ── Section 3: Change Password ─────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.08em" }}>
            Change Password
          </h2>
          <p className="mt-1 mb-5 text-[13px] text-[--color-text-tertiary]">Minimum 8 characters.</p>

          <div className="space-y-4">
            <Field label="Current password">
              <TextInput type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
            </Field>
            <Field label="New password">
              <TextInput type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <TextInput type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={changePassword}
              disabled={changingPw || !currentPw || !newPw || !confirmPw}
              className={BTN_PRIMARY}
              style={BTN_PRIMARY_STYLE}
            >
              {changingPw ? "Updating..." : "Change password"}
            </button>
          </div>
        </section>

        <div className="my-10" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />

        {/* ── Section 4: Account ─────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.08em" }}>
            Account
          </h2>

          <div className="mt-5">
            <button
              onClick={logout}
              className="rounded-full border border-[--color-border] bg-[--color-card] px-5 py-2.5 text-[14px] font-medium text-[--color-text-primary] transition-all duration-200 hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
            >
              Log out
            </button>
          </div>
        </section>

        <div className="mt-12 text-center">
          <Link href="/dashboard" className="text-[13px] text-[--color-text-tertiary] hover:text-[--color-text-secondary]">
            ← Back to dashboard
          </Link>
        </div>
      </main>

      {toast && <Toast message={toast.msg} kind={toast.kind} />}
    </div>
  );
}
