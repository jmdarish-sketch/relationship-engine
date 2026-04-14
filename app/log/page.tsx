"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/Toast";

function buildDisplayName(f: string, l: string, co?: string, sc?: string) { const n = [f, l].filter(Boolean).join(" "); const c = co || sc; return c ? `${n} — ${c}` : n; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function parseContactInfo(raw: string) { let email: string | null = null, phone: string | null = null, linkedin: string | null = null; const parts: string[] = []; for (const c of raw.split(/[,;\n]+/).map((s) => s.trim())) { if (!c) continue; if (c.includes("@") && c.includes(".")) email = c; else if (c.includes("linkedin.com/")) linkedin = c; else if (/^[\d\s\-+().]{7,}$/.test(c)) phone = c; else parts.push(c); } return { email, phone, linkedin, remainder: parts.length ? parts.join(", ") : null }; }

const INPUT = "w-full rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3 text-[15px] text-[--color-text-primary] placeholder-[--color-text-tertiary] transition-all duration-200 focus:border-[--color-accent] focus:outline-none";
const FOCUS = "0 0 0 3px rgba(59,130,246,0.15)";

export default function LogConversationPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth({ redirectTo: "/login" });
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState(""); const [school, setSchool] = useState(""); const [role, setRole] = useState(""); const [context, setContext] = useState("");
  const [topics, setTopics] = useState(""); const [actionItems, setActionItems] = useState(""); const [nextMeeting, setNextMeeting] = useState("");
  const [contactInfo, setContactInfo] = useState(""); const [impression, setImpression] = useState(""); const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [duplicateMatch, setDuplicateMatch] = useState<{ id: string; displayName: string } | null>(null);

  async function handleSubmit(useExistingPersonId?: string) {
    if (!firstName.trim()) { setError("First name is required"); return; }
    setError(""); setSaving(true);
    try {
      let personId: string;
      if (useExistingPersonId) { personId = useExistingPersonId; setDuplicateMatch(null); }
      else {
        const existing = await api.get<{ data: { id: string; displayName: string; firstName: string | null; lastName: string | null }[] }>(`/api/people?search=${encodeURIComponent(firstName.trim())}&limit=20`);
        const match = existing.data.find((p) => p.firstName?.toLowerCase() === firstName.trim().toLowerCase() && p.lastName?.toLowerCase() === (lastName.trim().toLowerCase() || null));
        if (match) { setDuplicateMatch({ id: match.id, displayName: match.displayName }); setSaving(false); return; }
        const contact = contactInfo.trim() ? parseContactInfo(contactInfo.trim()) : { email: null, phone: null, linkedin: null, remainder: null };
        const notesParts: string[] = []; if (contact.remainder) notesParts.push(`Contact: ${contact.remainder}`);
        const personRes = await api.post<{ data: { id: string } }>("/api/people", { display_name: buildDisplayName(firstName.trim(), lastName.trim(), company.trim() || undefined, school.trim() || undefined), first_name: firstName.trim(), last_name: lastName.trim() || undefined, employer: company.trim() || undefined, school: school.trim() || undefined, user_current_role: role.trim() || undefined, email: contact.email ?? undefined, phone: contact.phone ?? undefined, linkedin_url: contact.linkedin ?? undefined, notes: notesParts.length > 0 ? notesParts.join("\n") : undefined });
        personId = personRes.data.id;
      }
      const tp: string[] = []; if (context.trim()) tp.push(`Context: ${context.trim()}`); if (topics.trim()) tp.push(`Key Topics:\n${topics.trim()}`); if (actionItems.trim()) tp.push(`Action Items:\n${actionItems.trim()}`); if (nextMeeting.trim()) tp.push(`Next Meeting: ${nextMeeting.trim()}`); if (impression.trim()) tp.push(`Impression:\n${impression.trim()}`);
      const transcript = tp.join("\n\n");
      const intRes = await api.post<{ data: { id: string } }>("/api/interactions", { transcript: transcript || undefined, interaction_date: new Date(date).toISOString(), person_ids: [personId], notes: transcript || undefined });
      const iid = intRes.data.id;
      const details: { person_id: string; interaction_id: string; category: string; detail_key: string; detail_value: string }[] = [];
      if (company.trim()) details.push({ person_id: personId, interaction_id: iid, category: "career", detail_key: "employer", detail_value: company.trim() });
      if (role.trim()) details.push({ person_id: personId, interaction_id: iid, category: role.trim().toLowerCase().includes("major") ? "education" : "career", detail_key: "role", detail_value: role.trim() });
      if (school.trim()) details.push({ person_id: personId, interaction_id: iid, category: "education", detail_key: "school", detail_value: school.trim() });
      if (context.trim()) details.push({ person_id: personId, interaction_id: iid, category: "personal", detail_key: "how_we_met", detail_value: context.trim() });
      if (impression.trim()) details.push({ person_id: personId, interaction_id: iid, category: "personal", detail_key: "impression", detail_value: impression.trim() });
      if (actionItems.trim()) for (const line of actionItems.split("\n").filter((l) => l.trim())) details.push({ person_id: personId, interaction_id: iid, category: "action_item", detail_key: "follow_up", detail_value: line.trim() });
      if (nextMeeting.trim()) details.push({ person_id: personId, interaction_id: iid, category: "action_item", detail_key: "next_meeting", detail_value: nextMeeting.trim() });
      if (topics.trim()) details.push({ person_id: personId, interaction_id: iid, category: "personal", detail_key: "topics_discussed", detail_value: topics.trim() });
      for (const d of details) { try { await api.post("/api/extracted-details", d); } catch {} }
      showToast("Conversation saved successfully!");
      router.push("/dashboard");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save"); } finally { setSaving(false); }
  }

  async function handleSubmitForceNew() {
    setDuplicateMatch(null);
    const contact = contactInfo.trim() ? parseContactInfo(contactInfo.trim()) : { email: null, phone: null, linkedin: null, remainder: null };
    const notesParts: string[] = []; if (contact.remainder) notesParts.push(`Contact: ${contact.remainder}`);
    setSaving(true); setError("");
    try {
      const res = await api.post<{ data: { id: string } }>("/api/people", { display_name: buildDisplayName(firstName.trim(), lastName.trim(), company.trim() || undefined, school.trim() || undefined), first_name: firstName.trim(), last_name: lastName.trim() || undefined, employer: company.trim() || undefined, school: school.trim() || undefined, user_current_role: role.trim() || undefined, email: contact.email ?? undefined, phone: contact.phone ?? undefined, linkedin_url: contact.linkedin ?? undefined, notes: notesParts.length > 0 ? notesParts.join("\n") : undefined });
      await handleSubmit(res.data.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); setSaving(false); }
  }

  if (authLoading) return <div className="relative z-10 flex min-h-full items-center justify-center"><p className="text-[13px] text-[--color-text-tertiary]">Loading...</p></div>;

  function lbl(t: string, opt = false) {
    return <label className="mb-1.5 block text-[13px] font-medium text-[--color-text-secondary]">{t}{opt && <span className="ml-1 font-normal text-[--color-text-tertiary]">(optional)</span>}</label>;
  }
  function inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={INPUT} style={{ boxShadow: "none" }} onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS)} onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />;
  }
  function txa(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={`${INPUT} resize-y`} style={{ boxShadow: "none", minHeight: "100px" }} onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS)} onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />;
  }

  return (
    <div className="relative z-10 min-h-full">
      <Navbar backLink={{ href: "/dashboard", label: "Home" }} />
      <main className="animate-page mx-auto max-w-[600px] px-6 sm:px-6 px-4 py-6">

        <h1 className="text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>Log a Conversation</h1>
        <p className="mt-1 mb-7 text-[14px] text-[--color-text-secondary]">Record the details of a recent conversation.</p>

        {/* Duplicate Modal */}
        {duplicateMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }} onClick={() => setDuplicateMatch(null)}>
            <div className="w-full max-w-[420px] rounded-2xl bg-[--color-card] p-8 mx-4" style={{ boxShadow: "var(--shadow-card-hover)" }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[18px] font-bold text-[--color-text-primary]">Contact already exists</h3>
              <p className="mt-3 mb-6 text-[14px] text-[--color-text-secondary]">A contact named &quot;{duplicateMatch.displayName}&quot; already exists.</p>
              <button onClick={() => handleSubmit(duplicateMatch.id)} disabled={saving} className="flex w-full items-center justify-center rounded-full py-3 text-[15px] font-semibold text-white transition-all disabled:opacity-60 mb-2.5" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>Link to Existing</button>
              <button onClick={handleSubmitForceNew} disabled={saving} className="w-full rounded-full border border-[--color-border] bg-[--color-card] py-3 text-[14px] font-medium text-[--color-text-primary] transition-colors hover:bg-[#F8FAFC]">Create New Contact</button>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-2xl bg-[--color-card] p-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
            {/* Group 1: Who */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>{lbl("First Name")}{inp({ type: "text", value: firstName, onChange: (e) => setFirstName(e.target.value), required: true, placeholder: "Zach" })}</div>
              <div>{lbl("Last Name")}{inp({ type: "text", value: lastName, onChange: (e) => setLastName(e.target.value), placeholder: "Williams" })}</div>
            </div>

            <div style={{ height: "0.5px", background: "var(--color-border-subtle)", margin: "28px 0" }} />

            {/* Group 2: Context */}
            <div>{lbl("Company / Organization", true)}{inp({ value: company, onChange: (e) => setCompany(e.target.value), placeholder: "Evercore, McKinsey, etc." })}</div>
            <div>{lbl("School", true)}{inp({ value: school, onChange: (e) => setSchool(e.target.value), placeholder: "Wharton, Ross, etc." })}</div>
            <div>{lbl("Their Role / Major", true)}{inp({ value: role, onChange: (e) => setRole(e.target.value), placeholder: "TMT Analyst, Finance major" })}</div>
            <div>{lbl("How You Met", true)}{inp({ value: context, onChange: (e) => setContext(e.target.value), placeholder: "Career fair, class project, friend of a friend" })}</div>

            <div style={{ height: "0.5px", background: "var(--color-border-subtle)", margin: "28px 0" }} />

            {/* Group 3: Conversation */}
            <div>{lbl("Key Topics Discussed", true)}{txa({ value: topics, onChange: (e) => setTopics(e.target.value), placeholder: "What did you talk about?", rows: 4 })}</div>
            <div>{lbl("Action Items", true)}{txa({ value: actionItems, onChange: (e) => setActionItems(e.target.value), placeholder: "Follow-ups, intros promised (one per line)", rows: 4 })}</div>
            <div>{lbl("Next Meeting Plans", true)}{inp({ value: nextMeeting, onChange: (e) => setNextMeeting(e.target.value), placeholder: "Coffee next Tuesday, follow up in 2 weeks" })}</div>

            <div style={{ height: "0.5px", background: "var(--color-border-subtle)", margin: "28px 0" }} />

            {/* Group 4: Contact & Notes */}
            <div>{lbl("Their Contact Info", true)}{inp({ value: contactInfo, onChange: (e) => setContactInfo(e.target.value), placeholder: "Email, phone, or LinkedIn URL" })}</div>
            <div>{lbl("Your Impression", true)}{txa({ value: impression, onChange: (e) => setImpression(e.target.value), placeholder: "What was your read on this person?", rows: 3 })}</div>
            <div>{lbl("Conversation Date")}{inp({ type: "date", value: date, onChange: (e) => setDate(e.target.value) })}</div>

            {error && <div className="rounded-xl px-4 py-3 text-[13px] text-[--color-danger]" style={{ background: "rgba(239,68,68,0.08)" }}>{error}</div>}

            <button type="submit" disabled={saving || !!duplicateMatch} className="flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none mt-8" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>
              {saving ? "Saving..." : "Save Conversation"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
