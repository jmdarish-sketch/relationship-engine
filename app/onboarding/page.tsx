"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CAREER_SUGGESTIONS = ["Investment Banking","Consulting","Private Equity","Venture Capital","Tech","Startups","Real Estate","Law","Medicine"];
const INTEREST_SUGGESTIONS = ["Golf","Basketball","Travel","Reading","Cooking","Fitness","Music","Gaming","Hiking","Photography"];
const SKILL_SUGGESTIONS = ["Financial Modeling","Python","Data Analysis","Public Speaking","Design","Marketing","Sales","Writing","Leadership","Research"];
const TOTAL_STEPS = 9; // 5 profile + 4 omi

const INPUT = "w-full rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3 text-[15px] text-[--color-text-primary] placeholder-[--color-text-tertiary] transition-all duration-200 focus:border-[--color-accent] focus:outline-none";
const FOCUS_SHADOW = "0 0 0 3px rgba(59,130,246,0.15)";

const stepMeta = [
  { label: "Education" },
  { label: "Career" },
  { label: "Goals" },
  { label: "About You" },
  { label: "Review" },
  { label: "Omi" },
  { label: "API Key" },
  { label: "Webhook" },
  { label: "Done" },
];

// ---------------------------------------------------------------------------
// Tag Input
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

// ---------------------------------------------------------------------------
// SVG Illustrations for Omi screens
// ---------------------------------------------------------------------------

function OmiPitchIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mx-auto">
      <circle cx="60" cy="60" r="40" stroke="#3B82F6" strokeWidth="2" fill="#EFF6FF" />
      <circle cx="60" cy="60" r="14" fill="#3B82F6" />
      <circle cx="60" cy="60" r="10" fill="white" />
      <circle cx="60" cy="60" r="5" fill="#3B82F6" />
      {/* Sound waves */}
      <path d="M82 46c6 8 6 20 0 28" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M90 38c10 14 10 30 0 44" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M38 46c-6 8-6 20 0 28" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M30 38c-10 14-10 30 0 44" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
    </svg>
  );
}

function PhoneSettingsIcon() {
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
      <rect x="4" y="2" width="48" height="68" rx="8" stroke="#D4D4D8" strokeWidth="1.5" fill="white" />
      <rect x="20" y="4" width="16" height="3" rx="1.5" fill="#E4E4E7" />
      {/* Settings rows */}
      <rect x="12" y="16" width="32" height="6" rx="3" fill="#F4F4F5" />
      <rect x="12" y="26" width="32" height="6" rx="3" fill="#F4F4F5" />
      {/* Highlighted profile/gear */}
      <rect x="12" y="36" width="32" height="6" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1" />
      <circle cx="17" cy="39" r="2" fill="#3B82F6" />
    </svg>
  );
}

function DevSettingsIcon() {
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
      <rect x="4" y="2" width="48" height="68" rx="8" stroke="#D4D4D8" strokeWidth="1.5" fill="white" />
      <rect x="12" y="14" width="32" height="6" rx="3" fill="#F4F4F5" />
      <rect x="12" y="24" width="32" height="6" rx="3" fill="#F4F4F5" />
      <rect x="12" y="34" width="32" height="6" rx="3" fill="#F4F4F5" />
      {/* Highlighted Developer Settings */}
      <rect x="12" y="44" width="32" height="6" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1" />
      <text x="16" y="49" fontSize="4" fill="#3B82F6" fontFamily="system-ui">Developer</text>
    </svg>
  );
}

function CreateKeyIcon() {
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
      <rect x="4" y="2" width="48" height="68" rx="8" stroke="#D4D4D8" strokeWidth="1.5" fill="white" />
      <text x="12" y="18" fontSize="5" fill="#A1A1AA" fontFamily="system-ui">Developer API</text>
      <rect x="12" y="24" width="32" height="6" rx="3" fill="#F4F4F5" />
      {/* + Create Key button */}
      <rect x="12" y="36" width="32" height="8" rx="4" fill="#3B82F6" />
      <line x1="24" y1="40" x2="32" y2="40" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="36" x2="28" y2="44" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CopyKeyIcon() {
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
      <rect x="4" y="2" width="48" height="68" rx="8" stroke="#D4D4D8" strokeWidth="1.5" fill="white" />
      <text x="12" y="20" fontSize="5" fill="#A1A1AA" fontFamily="system-ui">Your Key</text>
      {/* Key value row */}
      <rect x="10" y="26" width="36" height="10" rx="4" fill="#F4F4F5" stroke="#D4D4D8" strokeWidth="0.5" />
      <text x="14" y="33" fontSize="5" fill="#3B82F6" fontFamily="monospace">omi_dev_k...</text>
      {/* Copy icon */}
      <rect x="38" y="40" width="10" height="12" rx="2" stroke="#3B82F6" strokeWidth="1.2" fill="none" />
      <rect x="35" y="37" width="10" height="12" rx="2" stroke="#3B82F6" strokeWidth="1.2" fill="white" />
    </svg>
  );
}

function WebhookSectionIcon() {
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
      <rect x="4" y="2" width="48" height="68" rx="8" stroke="#D4D4D8" strokeWidth="1.5" fill="white" />
      <text x="12" y="18" fontSize="5" fill="#A1A1AA" fontFamily="system-ui">Webhooks</text>
      <rect x="12" y="24" width="32" height="6" rx="3" fill="#F4F4F5" />
      <rect x="12" y="34" width="32" height="6" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1" />
    </svg>
  );
}

function ToggleOnIcon() {
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
      <rect x="4" y="2" width="48" height="68" rx="8" stroke="#D4D4D8" strokeWidth="1.5" fill="white" />
      <text x="10" y="30" fontSize="5" fill="#71717A" fontFamily="system-ui">Conversation</text>
      <text x="10" y="38" fontSize="5" fill="#71717A" fontFamily="system-ui">Events</text>
      {/* Toggle */}
      <rect x="34" y="28" width="14" height="8" rx="4" fill="#3B82F6" />
      <circle cx="44" cy="32" r="3" fill="white" />
    </svg>
  );
}

function PasteUrlIcon() {
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
      <rect x="4" y="2" width="48" height="68" rx="8" stroke="#D4D4D8" strokeWidth="1.5" fill="white" />
      <text x="12" y="24" fontSize="5" fill="#A1A1AA" fontFamily="system-ui">Webhook URL</text>
      <rect x="10" y="28" width="36" height="10" rx="4" fill="#F4F4F5" stroke="#3B82F6" strokeWidth="1" />
      <text x="14" y="35" fontSize="4" fill="#3B82F6" fontFamily="monospace">https://...</text>
    </svg>
  );
}

function SaveButtonIcon() {
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
      <rect x="4" y="2" width="48" height="68" rx="8" stroke="#D4D4D8" strokeWidth="1.5" fill="white" />
      {/* Top bar with Save */}
      <rect x="4" y="2" width="48" height="12" rx="8" fill="#FAFAFA" />
      <rect x="36" y="5" width="12" height="6" rx="3" fill="#3B82F6" />
      <text x="38" y="10" fontSize="4" fill="white" fontFamily="system-ui">Save</text>
    </svg>
  );
}

function SuccessCheckmark() {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full animate-[scaleIn_0.4s_ease-out]" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
      <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" className="animate-[drawCheck_0.5s_ease-out_0.2s_both]" style={{ strokeDasharray: 30, strokeDashoffset: 30 }} />
      </svg>
    </div>
  );
}

// Instruction step row for Omi guide screens
function InstructionStep({ num, text, illustration }: { num: number; text: string; illustration: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-[--color-card] p-4 transition-all" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
        {num}
      </div>
      <p className="flex-1 text-[14px] leading-[1.55] text-[--color-text-primary]">{text}</p>
      <div className="shrink-0">{illustration}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Profile fields
  const [school, setSchool] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [major, setMajor] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [networkingGoals, setNetworkingGoals] = useState("");
  const [personalInterests, setPersonalInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  // Omi fields
  const [omiKey, setOmiKey] = useState("");
  const [webhookConfirmed, setWebhookConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const { user, isLoading: authLoading } = useAuth({ redirectTo: "/login" });
  const webhookUrl = user ? `https://relationship-engine-ten.vercel.app/api/webhook/omi?uid=${user.id}` : "";

  // Save profile data via /api/onboarding
  async function saveProfile() {
    await api.post("/api/onboarding", {
      school: school || null,
      graduation_year: gradYear ? parseInt(gradYear) : null,
      major: major || null,
      career_interests: careerInterests,
      current_role: currentRole || null,
      networking_goals: networkingGoals || null,
      personal_interests: personalInterests,
      skills,
    });
  }

  // Mark onboarding complete and go to dashboard
  async function completeOnboarding() {
    setLoading(true);
    try {
      // Ensure profile is saved if we haven't yet
      if (step <= 5) await saveProfile();
      await api.post("/api/onboarding", {
        school: school || null,
        graduation_year: gradYear ? parseInt(gradYear) : null,
        major: major || null,
        career_interests: careerInterests,
        current_role: currentRole || null,
        networking_goals: networkingGoals || null,
        personal_interests: personalInterests,
        skills,
      });
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  // Save Omi API key
  async function saveOmiKey() {
    try {
      await api.put("/api/user/profile", { omi_api_key: omiKey });
    } catch {}
  }

  async function handleProfileNext() {
    setLoading(true);
    try {
      await saveProfile();
      goNext();
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleOmiKeyNext() {
    setLoading(true);
    try {
      await saveOmiKey();
      goNext();
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleWebhookDone() {
    setLoading(true);
    try {
      await completeOnboarding();
    } catch {} finally {
      setLoading(false);
    }
  }

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function goNext() { setStep((s) => Math.min(s + 1, TOTAL_STEPS)); }
  function goBack() { setStep((s) => Math.max(s - 1, 1)); }

  if (authLoading) {
    return <div className="relative z-10 flex min-h-full items-center justify-center"><p className="text-[13px] text-[--color-text-tertiary]">Loading...</p></div>;
  }

  function inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={INPUT} style={{ boxShadow: "none" }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS_SHADOW)}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />;
  }

  // ---------------------------------------------------------------------------
  // Progress bar
  // ---------------------------------------------------------------------------
  const progress = (
    <div className="mb-10">
      <div className="flex items-center justify-center gap-0">
        {stepMeta.map((_, i) => {
          const num = i + 1;
          const done = num < step;
          const active = num === step;
          return (
            <div key={i} className="flex items-center">
              {i > 0 && (
                <div className="h-0.5 w-5 sm:w-8" style={{ background: done || active ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "#E2E8F0" }} />
              )}
              <div
                className="flex h-2.5 w-2.5 items-center justify-center rounded-full transition-all duration-300"
                style={{
                  background: done || active ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "#E2E8F0",
                  boxShadow: active ? "0 0 0 4px rgba(59,130,246,0.2)" : "none",
                  outline: active ? "2px solid white" : "none",
                }}
              />
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[13px] text-[--color-text-secondary]">{stepMeta[step - 1].label}</p>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Skip / later link
  // ---------------------------------------------------------------------------
  const skipLink = (
    <button
      onClick={completeOnboarding}
      disabled={loading}
      className="mx-auto mt-6 block text-[13px] text-[--color-text-tertiary] transition-colors hover:text-[--color-text-secondary]"
    >
      I&apos;ll do this later
    </button>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="relative z-10 min-h-screen px-4 pt-12 pb-12">
      <div className="mx-auto max-w-[560px]">
        {progress}

        {/* ── Profile Step 1: Education ─────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-center text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>Tell us about your education</h2>
            <p className="mt-2 mb-8 text-center text-[14px] text-[--color-text-secondary]">This helps us personalize your networking experience</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">School</label>
                {inp({ type: "text", value: school, onChange: (e) => setSchool(e.target.value), placeholder: "e.g. University of Michigan" })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Graduation year</label>
                  {inp({ type: "number", value: gradYear, onChange: (e) => setGradYear(e.target.value), placeholder: "e.g. 2026" })}
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Major</label>
                  {inp({ type: "text", value: major, onChange: (e) => setMajor(e.target.value), placeholder: "e.g. Finance" })}
                </div>
              </div>
            </div>
            <div className="mt-10 flex justify-end">
              <button onClick={goNext} className="rounded-full px-8 py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Next →</button>
            </div>
          </div>
        )}

        {/* ── Profile Step 2: Career ───────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="text-center text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>What are you focused on?</h2>
            <p className="mt-2 mb-8 text-center text-[14px] text-[--color-text-secondary]">Your career interests shape how we prepare your briefs</p>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Current role or status</label>
              {inp({ type: "text", value: currentRole, onChange: (e) => setCurrentRole(e.target.value), placeholder: "e.g. Senior at Ross, Incoming analyst at Goldman" })}
            </div>
            <div className="mt-10 flex items-center justify-between">
              <button onClick={goBack} className="text-[14px] text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary]">← Back</button>
              <button onClick={goNext} className="rounded-full px-8 py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Next →</button>
            </div>
          </div>
        )}

        {/* ── Profile Step 3: Goals ────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 className="text-center text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>Your networking goals</h2>
            <p className="mt-2 mb-8 text-center text-[14px] text-[--color-text-secondary]">We&apos;ll tailor outreach suggestions to what you&apos;re building toward</p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[--color-text-secondary]">Career interests</label>
                <TagInput tags={careerInterests} setTags={setCareerInterests} suggestions={CAREER_SUGGESTIONS} placeholder="Type and press Enter" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Networking goals</label>
                <textarea value={networkingGoals} onChange={(e) => setNetworkingGoals(e.target.value)}
                  placeholder="What are you trying to accomplish with your network?"
                  rows={4} className={`${INPUT} resize-none`} style={{ boxShadow: "none", minHeight: "100px" }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS_SHADOW)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />
              </div>
            </div>
            <div className="mt-10 flex items-center justify-between">
              <button onClick={goBack} className="text-[14px] text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary]">← Back</button>
              <button onClick={goNext} className="rounded-full px-8 py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Next →</button>
            </div>
          </div>
        )}

        {/* ── Profile Step 4: About You ────────────────────── */}
        {step === 4 && (
          <div>
            <h2 className="text-center text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>A bit about you</h2>
            <p className="mt-2 mb-8 text-center text-[14px] text-[--color-text-secondary]">Personal interests help us find common ground with your contacts</p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[--color-text-secondary]">Personal interests</label>
                <TagInput tags={personalInterests} setTags={setPersonalInterests} suggestions={INTEREST_SUGGESTIONS} placeholder="Type and press Enter" />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[--color-text-secondary]">Skills you can offer</label>
                <TagInput tags={skills} setTags={setSkills} suggestions={SKILL_SUGGESTIONS} placeholder="Type and press Enter" />
              </div>
            </div>
            <div className="mt-10 flex items-center justify-between">
              <button onClick={goBack} className="text-[14px] text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary]">← Back</button>
              <button onClick={goNext} className="rounded-full px-8 py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Next →</button>
            </div>
          </div>
        )}

        {/* ── Profile Step 5: Review ───────────────────────── */}
        {step === 5 && (
          <div>
            <h2 className="text-center text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>Looking good!</h2>
            <p className="mt-2 mb-8 text-center text-[14px] text-[--color-text-secondary]">Review your info and continue to device setup</p>
            <div className="space-y-3">
              {[
                { label: "EDUCATION", items: [school && `School: ${school}`, gradYear && `Class of ${gradYear}`, major && `Major: ${major}`].filter(Boolean) },
                { label: "CAREER", items: [currentRole && `Role: ${currentRole}`, careerInterests.length > 0 && `Interests: ${careerInterests.join(", ")}`].filter(Boolean) },
                { label: "GOALS", items: [networkingGoals].filter(Boolean) },
                { label: "ABOUT YOU", items: [personalInterests.length > 0 && `Interests: ${personalInterests.join(", ")}`, skills.length > 0 && `Skills: ${skills.join(", ")}`].filter(Boolean) },
              ].filter((b) => b.items.length > 0).map((block) => (
                <div key={block.label} className="rounded-xl bg-[--color-card] p-4" style={{ boxShadow: "var(--shadow-card)" }}>
                  <p className="mb-2 text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.05em" }}>{block.label}</p>
                  {block.items.map((item, i) => (
                    <p key={i} className="text-[14px] text-[--color-text-primary]">{item}</p>
                  ))}
                </div>
              ))}
              {![school, gradYear, major, currentRole, networkingGoals].some(Boolean) && careerInterests.length === 0 && personalInterests.length === 0 && skills.length === 0 && (
                <p className="text-center text-[14px] text-[--color-text-tertiary] py-4">No information added. You can always update later.</p>
              )}
            </div>
            <div className="mt-10 flex items-center justify-between">
              <button onClick={goBack} className="text-[14px] text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary]">← Back</button>
              <button onClick={handleProfileNext} disabled={loading}
                className="rounded-full px-8 py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px disabled:opacity-60 disabled:pointer-events-none"
                style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>
                {loading ? "Saving..." : "Next →"}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* Omi Screen 1: The Pitch                             */}
        {/* ════════════════════════════════════════════════════ */}
        {step === 6 && (
          <div className="text-center">
            <div className="mt-4 mb-8">
              <OmiPitchIllustration />
            </div>
            <h2 className="text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>Connect your Omi device</h2>
            <p className="mx-auto mt-4 max-w-[440px] text-[15px] leading-[1.7] text-[--color-text-secondary]">
              Once connected, every conversation you have is automatically captured, analyzed, and added to your network intelligence. No manual note-taking. No forgetting what someone told you.
            </p>
            <button
              onClick={goNext}
              className="mt-8 w-full rounded-full py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}
            >
              Connect now
            </button>
            {skipLink}
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* Omi Screen 2: Get your API key                      */}
        {/* ════════════════════════════════════════════════════ */}
        {step === 7 && (
          <div>
            <h2 className="text-center text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>Get your Omi developer key</h2>
            <p className="mt-2 mb-8 text-center text-[14px] text-[--color-text-secondary]">Don&apos;t worry — you don&apos;t need to be a developer. This just lets your Omi talk to Relationship Engine.</p>
            <div className="space-y-3">
              <InstructionStep num={1} text="Open the Omi app and tap your profile icon, then tap Settings" illustration={<PhoneSettingsIcon />} />
              <InstructionStep num={2} text="Scroll down and tap Developer Settings" illustration={<DevSettingsIcon />} />
              <InstructionStep num={3} text='Tap + Create Key under Developer API' illustration={<CreateKeyIcon />} />
              <InstructionStep num={4} text="Tap the key to copy it" illustration={<CopyKeyIcon />} />
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Paste your API key here</label>
              <div className="relative">
                <input
                  type="text" value={omiKey} onChange={(e) => setOmiKey(e.target.value)}
                  placeholder="omi_dev_..."
                  className={INPUT} style={{ boxShadow: "none", paddingRight: "40px" }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS_SHADOW)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                />
                {omiKey.length > 0 && (
                  <svg className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#10B981]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button onClick={goBack} className="text-[14px] text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary]">← Back</button>
              <button onClick={handleOmiKeyNext} disabled={!omiKey || loading}
                className="rounded-full px-8 py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px disabled:opacity-60 disabled:pointer-events-none"
                style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>
                {loading ? "Saving..." : "Next →"}
              </button>
            </div>
            {skipLink}
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* Omi Screen 3: Connect the webhook                   */}
        {/* ════════════════════════════════════════════════════ */}
        {step === 8 && (
          <div>
            <h2 className="text-center text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>Almost done! Connect the link</h2>
            <p className="mt-2 mb-8 text-center text-[14px] text-[--color-text-secondary]">One more step in the Omi app, then you&apos;re all set.</p>
            <div className="space-y-3">
              <InstructionStep num={1} text="In Developer Settings, scroll to Webhooks" illustration={<WebhookSectionIcon />} />
              <InstructionStep num={2} text="Turn on Conversation Events" illustration={<ToggleOnIcon />} />

              {/* Step 3 with webhook URL */}
              <div className="rounded-xl bg-[--color-card] p-4" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>3</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] leading-[1.55] text-[--color-text-primary]">It will ask for a URL. Paste this:</p>
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#FAFAFA] px-3 py-2.5 border border-[--color-border]">
                      <code className="flex-1 truncate text-[12px] text-[--color-accent]" style={{ fontFamily: "monospace" }}>{webhookUrl}</code>
                      <button onClick={copyWebhook}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-all hover:-translate-y-px"
                        style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0"><PasteUrlIcon /></div>
                </div>
              </div>

              <InstructionStep num={4} text="Tap Save at the top right of the Omi screen" illustration={<SaveButtonIcon />} />
            </div>

            {/* Confirmation checkbox */}
            <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3.5 transition-colors hover:border-[--color-accent-light]">
              <input type="checkbox" checked={webhookConfirmed} onChange={(e) => setWebhookConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-[--color-border] text-[--color-accent] focus:ring-[--color-accent] accent-[#3B82F6]" />
              <span className="text-[14px] text-[--color-text-primary]">I&apos;ve pasted the URL and tapped Save in the Omi app</span>
            </label>

            <div className="mt-8 flex items-center justify-between">
              <button onClick={goBack} className="text-[14px] text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary]">← Back</button>
              <button onClick={handleWebhookDone} disabled={!webhookConfirmed || loading}
                className="rounded-full px-8 py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px disabled:opacity-60 disabled:pointer-events-none"
                style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>
                {loading ? "Finishing..." : "Done"}
              </button>
            </div>
            {skipLink}
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* Omi Screen 4: Success                               */}
        {/* ════════════════════════════════════════════════════ */}
        {step === 9 && (
          <div className="text-center pt-8">
            <SuccessCheckmark />
            <h2 className="mt-8 text-[28px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>You&apos;re connected!</h2>
            <p className="mx-auto mt-4 max-w-[420px] text-[15px] leading-[1.7] text-[--color-text-secondary]">
              Your next conversation will automatically appear in your dashboard. Just wear your Omi and talk — we handle the rest.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-8 w-full rounded-full py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}
            >
              Go to dashboard
            </button>
            <p className="mt-4 text-[13px] text-[--color-text-tertiary]">You can manage your Omi connection anytime in Settings.</p>
          </div>
        )}
      </div>

      {/* Keyframe styles for success animation */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
