"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";

const CAREER_SUGGESTIONS = ["Investment Banking","Consulting","Private Equity","Venture Capital","Tech","Startups","Real Estate","Law","Medicine"];
const INTEREST_SUGGESTIONS = ["Golf","Basketball","Travel","Reading","Cooking","Fitness","Music","Gaming","Hiking","Photography"];
const SKILL_SUGGESTIONS = ["Financial Modeling","Python","Data Analysis","Public Speaking","Design","Marketing","Sales","Writing","Leadership","Research"];
const TOTAL_STEPS = 5;

const INPUT = "w-full rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3 text-[15px] text-[--color-text-primary] placeholder-[--color-text-tertiary] transition-all duration-200 focus:border-[--color-accent] focus:outline-none";
const FOCUS_SHADOW = "0 0 0 3px rgba(59,130,246,0.15)";

const stepMeta = [
  { title: "Tell us about your education", sub: "This helps us personalize your networking experience", label: "Education" },
  { title: "What are you focused on?", sub: "Your career interests shape how we prepare your briefs", label: "Career" },
  { title: "Your networking goals", sub: "We'll tailor outreach suggestions to what you're building toward", label: "Goals" },
  { title: "A bit about you", sub: "Personal interests help us find common ground with your contacts", label: "About You" },
  { title: "Looking good!", sub: "Review your info and you're ready to go", label: "Review" },
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
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dir, setDir] = useState<"next" | "back">("next");

  const [school, setSchool] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [major, setMajor] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [networkingGoals, setNetworkingGoals] = useState("");
  const [personalInterests, setPersonalInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  const { isLoading: authLoading } = useAuth({ redirectTo: "/login" });

  async function handleFinish() {
    setLoading(true);
    try {
      await api.post("/api/onboarding", {
        school: school || null, graduation_year: gradYear ? parseInt(gradYear) : null,
        major: major || null, career_interests: careerInterests,
        current_role: currentRole || null, networking_goals: networkingGoals || null,
        personal_interests: personalInterests, skills,
      });
      router.push("/dashboard");
    } catch {} finally { setLoading(false); }
  }

  function goNext() { setDir("next"); setStep((s) => Math.min(s + 1, TOTAL_STEPS)); }
  function goBack() { setDir("back"); setStep((s) => Math.max(s - 1, 1)); }

  if (authLoading) {
    return <div className="relative z-10 flex min-h-full items-center justify-center"><p className="text-[13px] text-[--color-text-tertiary]">Loading...</p></div>;
  }

  const current = stepMeta[step - 1];

  // Input helper with focus shadow
  function inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={INPUT} style={{ boxShadow: "none" }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS_SHADOW)}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />;
  }

  return (
    <div className="relative z-10 min-h-screen px-4 pt-12 pb-12">
      <div className="mx-auto max-w-[560px]">
        {/* ── Progress dots ────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center justify-center gap-0">
            {stepMeta.map((_, i) => {
              const num = i + 1;
              const done = num < step;
              const active = num === step;
              const future = num > step;
              return (
                <div key={i} className="flex items-center">
                  {i > 0 && (
                    <div className="h-0.5 w-10" style={{ background: done || active ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "#E2E8F0" }} />
                  )}
                  <div
                    className="flex h-3 w-3 items-center justify-center rounded-full transition-all duration-300"
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
          <p className="mt-3 text-center text-[13px] text-[--color-text-secondary]">{current.label}</p>
        </div>

        {/* ── Step content ─────────────────────────────────────── */}
        <h2 className="text-center text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>
          {current.title}
        </h2>
        <p className="mt-2 mb-8 text-center text-[14px] text-[--color-text-secondary]">
          {current.sub}
        </p>

        <div className="space-y-4">
          {step === 1 && (
            <>
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
            </>
          )}

          {step === 2 && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">Current role or status</label>
              {inp({ type: "text", value: currentRole, onChange: (e) => setCurrentRole(e.target.value), placeholder: "e.g. Senior at Ross, Incoming analyst at Goldman" })}
            </div>
          )}

          {step === 3 && (
            <>
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
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[--color-text-secondary]">Personal interests</label>
                <TagInput tags={personalInterests} setTags={setPersonalInterests} suggestions={INTEREST_SUGGESTIONS} placeholder="Type and press Enter" />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[--color-text-secondary]">Skills you can offer</label>
                <TagInput tags={skills} setTags={setSkills} suggestions={SKILL_SUGGESTIONS} placeholder="Type and press Enter" />
              </div>
            </>
          )}

          {step === 5 && (
            <div className="space-y-3">
              {[
                { label: "EDUCATION", items: [school && `School: ${school}`, gradYear && `Class of ${gradYear}`, major && `Major: ${major}`].filter(Boolean) },
                { label: "CAREER", items: [currentRole && `Role: ${currentRole}`, careerInterests.length > 0 && `Interests: ${careerInterests.join(", ")}`].filter(Boolean) },
                { label: "GOALS", items: [networkingGoals].filter(Boolean) },
                { label: "ABOUT YOU", items: [personalInterests.length > 0 && `Interests: ${personalInterests.join(", ")}`, skills.length > 0 && `Skills: ${skills.join(", ")}`].filter(Boolean) },
              ].filter((b) => b.items.length > 0).map((block) => (
                <div key={block.label} className="rounded-xl bg-[--color-card] p-4" style={{ boxShadow: "var(--shadow-card)" }}>
                  <p className="mb-2 text-[11px] font-semibold uppercase text-[--color-text-tertiary]" style={{ letterSpacing: "0.05em" }}>
                    {block.label}
                  </p>
                  {block.items.map((item, i) => (
                    <p key={i} className="text-[14px] text-[--color-text-primary]">{item}</p>
                  ))}
                </div>
              ))}
              {![school, gradYear, major, currentRole, networkingGoals].some(Boolean) && careerInterests.length === 0 && personalInterests.length === 0 && skills.length === 0 && (
                <p className="text-center text-[14px] text-[--color-text-tertiary] py-4">No information added. You can always update later.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <div className="mt-10 flex items-center justify-between">
          {step > 1 ? (
            <button onClick={goBack} className="text-[14px] text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary]">
              ← Back
            </button>
          ) : <div />}

          {step < TOTAL_STEPS ? (
            <button onClick={goNext}
              className="rounded-full px-8 py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>
              Next →
            </button>
          ) : (
            <button onClick={handleFinish} disabled={loading}
              className="w-full rounded-full py-4 px-6 text-[15px] font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>
              {loading ? "Setting up..." : "Complete Setup ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
