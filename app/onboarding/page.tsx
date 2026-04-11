"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const CAREER_SUGGESTIONS = [
  "Investment Banking",
  "Consulting",
  "Private Equity",
  "Venture Capital",
  "Tech",
  "Startups",
  "Real Estate",
  "Law",
  "Medicine",
];

const INTEREST_SUGGESTIONS = [
  "Golf",
  "Basketball",
  "Travel",
  "Reading",
  "Cooking",
  "Fitness",
  "Music",
  "Gaming",
  "Hiking",
  "Photography",
];

const SKILL_SUGGESTIONS = [
  "Financial Modeling",
  "Python",
  "Data Analysis",
  "Public Speaking",
  "Design",
  "Marketing",
  "Sales",
  "Writing",
  "Leadership",
  "Research",
];

const TOTAL_STEPS = 5;

function TagInput({
  tags,
  setTags,
  suggestions,
  placeholder,
}: {
  tags: string[];
  setTags: (tags: string[]) => void;
  suggestions: string[];
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  const unusedSuggestions = suggestions.filter((s) => !tags.includes(s));

  return (
    <div className="space-y-3">
      {/* Current tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 text-blue-400 hover:text-blue-600"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag(input);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
      />

      {/* Suggestions */}
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [school, setSchool] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [major, setMajor] = useState("");

  // Step 2
  const [currentRole, setCurrentRole] = useState("");

  // Step 3
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [networkingGoals, setNetworkingGoals] = useState("");

  // Step 4
  const [personalInterests, setPersonalInterests] = useState<string[]>([]);

  // Step 5
  const [skills, setSkills] = useState<string[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!localStorage.getItem("user_id")) {
      router.push("/login");
    }
  }, [router]);

  async function handleFinish() {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          school: school || null,
          graduation_year: gradYear ? parseInt(gradYear) : null,
          major: major || null,
          career_interests: careerInterests,
          user_current_role: currentRole || null,
          networking_goals: networkingGoals || null,
          personal_interests: personalInterests,
          skills,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update stored user
        const stored = localStorage.getItem("user");
        if (stored) {
          const user = JSON.parse(stored);
          user.onboarding_completed = true;
          localStorage.setItem("user", JSON.stringify(user));
        }
        router.push("/");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const stepTitles = [
    "Where are you?",
    "What's your current situation?",
    "What are your career goals?",
    "What are you into?",
    "What can you offer?",
  ];

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{stepTitles[step - 1]}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-100">
            <div
              className="h-1.5 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-6 text-xl font-semibold text-zinc-900">
            {stepTitles[step - 1]}
          </h2>

          {/* Step 1: School info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  School
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="e.g. University of Michigan"
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Graduation year
                </label>
                <input
                  type="number"
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  placeholder="e.g. 2026"
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Major / area of study
                </label>
                <input
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder="e.g. Finance, Computer Science"
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: Current role */}
          {step === 2 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Current role or status
              </label>
              <input
                type="text"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="e.g. Senior at Ross School of Business, Incoming analyst at Goldman Sachs"
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Step 3: Career goals */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Career interests
                </label>
                <TagInput
                  tags={careerInterests}
                  setTags={setCareerInterests}
                  suggestions={CAREER_SUGGESTIONS}
                  placeholder="Type and press Enter to add"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Networking goals
                </label>
                <textarea
                  value={networkingGoals}
                  onChange={(e) => setNetworkingGoals(e.target.value)}
                  placeholder="What are you trying to accomplish with your network right now?"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: Personal interests */}
          {step === 4 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Personal interests
              </label>
              <TagInput
                tags={personalInterests}
                setTags={setPersonalInterests}
                suggestions={INTEREST_SUGGESTIONS}
                placeholder="Type and press Enter to add"
              />
            </div>
          )}

          {/* Step 5: Skills */}
          {step === 5 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Skills you can offer
              </label>
              <TagInput
                tags={skills}
                setTags={setSkills}
                suggestions={SKILL_SUGGESTIONS}
                placeholder="Type and press Enter to add"
              />
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 rounded-lg border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 min-h-12"
              >
                Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 min-h-12"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 min-h-12"
              >
                {loading ? "Setting up..." : "Finish"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
