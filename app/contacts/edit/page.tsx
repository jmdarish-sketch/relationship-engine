"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePeople, useUpdatePerson, useDeletePerson } from "@/hooks/useApi";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface PersonRow { id: string; displayName: string; firstName: string | null; lastName: string | null; employer: string | null; userCurrentRole: string | null; school: string | null; email: string | null; phone: string | null; linkedinUrl: string | null; notes: string | null; }

const INPUT = "w-full rounded-xl border border-[--color-border] bg-[--color-card] px-4 py-3 text-[15px] text-[--color-text-primary] placeholder-[--color-text-tertiary] transition-all duration-200 focus:border-[--color-accent] focus:outline-none";
const FOCUS = "0 0 0 3px rgba(59,130,246,0.15)";

function EditForm({ person, onClose }: { person: PersonRow; onClose: () => void }) {
  const up = useUpdatePerson(); const del = useDeletePerson();
  const [firstName, setFirstName] = useState(person.firstName ?? ""); const [lastName, setLastName] = useState(person.lastName ?? "");
  const [employer, setEmployer] = useState(person.employer ?? ""); const [role, setRole] = useState(person.userCurrentRole ?? "");
  const [school, setSchool] = useState(person.school ?? ""); const [email, setEmail] = useState(person.email ?? "");
  const [phone, setPhone] = useState(person.phone ?? ""); const [linkedin, setLinkedin] = useState(person.linkedinUrl ?? "");
  const [notes, setNotes] = useState(person.notes ?? ""); const [confirmDelete, setConfirmDelete] = useState(false); const [saved, setSaved] = useState(false);

  const preview = useMemo(() => { const n = [firstName, lastName].filter(Boolean).join(" "); const c = employer || school; return n && c ? `${n} — ${c}` : n || person.displayName; }, [firstName, lastName, employer, school, person.displayName]);

  async function handleSave() { await up.mutateAsync({ id: person.id, first_name: firstName || null, last_name: lastName || null, display_name: preview, employer: employer || null, user_current_role: role || null, school: school || null, email: email || null, phone: phone || null, linkedin_url: linkedin || null, notes: notes || null }); setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 600); }
  async function handleDelete() { await del.mutateAsync(person.id); onClose(); }

  function lbl(t: string) { return <label className="mb-1 block text-[13px] font-medium text-[--color-text-secondary]">{t}</label>; }
  function grp(t: string) { return <p className="mt-5 mb-3 text-[11px] font-semibold uppercase text-[--color-text-tertiary] first:mt-0" style={{ letterSpacing: "0.05em" }}>{t}</p>; }
  function inp(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={INPUT} style={{ boxShadow: "none" }} onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS)} onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />; }

  return (
    <div className="px-5 py-6" style={{ background: "#F0F7FF" }}>
      <p className="mb-4 text-[12px] text-[--color-text-tertiary]">Preview: <span className="text-[--color-text-primary] font-medium">{preview}</span></p>
      {grp("Identity")}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-3"><div>{lbl("First Name")}{inp({ value: firstName, onChange: (e) => setFirstName(e.target.value) })}</div><div>{lbl("Last Name")}{inp({ value: lastName, onChange: (e) => setLastName(e.target.value) })}</div></div>
      {grp("Career")}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-3"><div>{lbl("Company")}{inp({ value: employer, onChange: (e) => setEmployer(e.target.value) })}</div><div>{lbl("Role / Title")}{inp({ value: role, onChange: (e) => setRole(e.target.value) })}</div></div>
      {grp("Education")}
      <div className="mb-3">{lbl("School")}{inp({ value: school, onChange: (e) => setSchool(e.target.value) })}</div>
      {grp("Contact")}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-3"><div>{lbl("Email")}{inp({ type: "email", value: email, onChange: (e) => setEmail(e.target.value) })}</div><div>{lbl("Phone")}{inp({ value: phone, onChange: (e) => setPhone(e.target.value) })}</div><div>{lbl("LinkedIn")}{inp({ value: linkedin, onChange: (e) => setLinkedin(e.target.value) })}</div></div>
      {grp("Notes")}
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${INPUT} resize-y`} style={{ boxShadow: "none", minHeight: "80px" }} onFocus={(e) => (e.currentTarget.style.boxShadow = FOCUS)} onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />

      <div className="mt-6 flex items-center gap-3">
        <button onClick={handleSave} disabled={up.isPending || saved} className="rounded-full px-6 py-2.5 text-[14px] font-semibold text-white transition-all disabled:opacity-60" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "var(--shadow-button)" }}>{saved ? "Saved!" : up.isPending ? "Saving..." : "Save"}</button>
        <button onClick={onClose} className="text-[14px] text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors">Cancel</button>
      </div>

      <div className="mt-5">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-[13px] text-[--color-danger] hover:underline transition-colors">Delete contact</button>
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
            <div className="w-full max-w-[400px] rounded-2xl bg-[--color-card] p-8 mx-4" style={{ boxShadow: "var(--shadow-card-hover)" }}>
              <h3 className="text-[18px] font-bold text-[--color-text-primary]">Delete contact?</h3>
              <p className="mt-3 mb-6 text-[14px] text-[--color-text-secondary]">This will permanently delete {person.displayName} and all their data.</p>
              <button onClick={handleDelete} disabled={del.isPending} className="w-full rounded-full bg-[--color-danger] py-3 text-[14px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 mb-2.5">Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="w-full rounded-full border border-[--color-border] bg-[--color-card] py-3 text-[14px] font-medium text-[--color-text-primary] transition-colors hover:bg-[#F8FAFC]">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditContactsPage() {
  const { isLoading: authLoading } = useAuth({ redirectTo: "/login" });
  const { data: peopleRes, isLoading: peopleLoading } = usePeople({ sort: "name", limit: 100 });
  const [search, setSearch] = useState(""); const [editingId, setEditingId] = useState<string | null>(null);
  const people = (peopleRes?.data ?? []) as PersonRow[];
  const total = (peopleRes?.meta as { total?: number } | undefined)?.total ?? people.length;
  const filtered = search.trim() ? people.filter((p) => p.displayName.toLowerCase().includes(search.toLowerCase())) : people;

  if (authLoading || peopleLoading) return <div className="relative z-10 flex min-h-full items-center justify-center"><p className="text-[13px] text-[--color-text-tertiary]">Loading...</p></div>;

  return (
    <div className="relative z-10 min-h-full">
      <Navbar backLink={{ href: "/dashboard", label: "Home" }} />
      <main className="animate-page mx-auto max-w-[800px] px-6 sm:px-6 px-4 py-6">

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-[24px] font-bold text-[--color-text-primary]" style={{ letterSpacing: "-0.02em" }}>Edit Contacts</h1>
          <span className="rounded-full bg-[--color-accent-surface] px-2.5 py-0.5 font-num text-[11px] font-medium text-[--color-accent]">{total}</span>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-full bg-[--color-card] px-5 py-3 transition-all" style={{ boxShadow: "var(--shadow-card)" }}>
          <svg className="h-4 w-4 text-[--color-text-tertiary]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by name..." className="flex-1 border-none bg-transparent text-[14px] text-[--color-text-primary] placeholder-[--color-text-tertiary] outline-none" />
        </div>

        {people.length === 0 ? (
          <div className="rounded-2xl bg-[--color-card] py-12 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-[14px] text-[--color-text-tertiary]">No contacts yet. <a href="/log" className="text-[--color-accent] hover:underline">Log a conversation</a> to get started.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[--color-card] overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            {filtered.map((person, i) => (
              <div key={person.id}>
                <div className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[rgba(59,130,246,0.03)]">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-[--color-text-primary] truncate">{person.displayName}</p>
                    <p className="mt-0.5 text-[13px] text-[--color-text-secondary] truncate">{[person.employer, person.school, person.userCurrentRole].filter(Boolean).join(" · ") || "No details"}</p>
                  </div>
                  <button onClick={() => setEditingId(editingId === person.id ? null : person.id)} className="shrink-0 flex items-center gap-1.5 text-[13px] text-[--color-text-tertiary] hover:text-[--color-accent] transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                    {editingId === person.id ? "Close" : "Edit"}
                  </button>
                </div>
                {editingId === person.id && <EditForm person={person} onClose={() => setEditingId(null)} />}
                {i < filtered.length - 1 && !editingId && <div className="mx-5" style={{ height: "0.5px", background: "var(--color-border-subtle)" }} />}
              </div>
            ))}
          </div>
        )}

        {people.length > 0 && filtered.length === 0 && <p className="mt-8 text-center text-[14px] text-[--color-text-tertiary]">No contacts match &quot;{search}&quot;</p>}
      </main>
    </div>
  );
}
