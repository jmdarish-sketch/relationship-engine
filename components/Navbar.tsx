"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface NavbarProps {
  backLink?: { href: string; label: string };
  showUser?: boolean;
}

export default function Navbar({ backLink, showUser = true }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={{
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-6 sm:px-6 px-4">
          {/* Left: logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}
            >
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.16v-1.67a2 2 0 011.632-1.966l.27-.05A9.36 9.36 0 0012 15c1.39 0 2.726-.303 3.927-.846"
                />
              </svg>
            </div>
            <span
              className="hidden sm:inline text-[15px] font-semibold text-[--color-text-primary]"
              style={{ letterSpacing: "-0.01em" }}
            >
              Relationship Engine
            </span>
          </Link>

          {/* Right: user + settings + logout */}
          {showUser && user && (
            <div className="flex items-center gap-4">
              <span className="text-[13px] text-[--color-text-secondary]">
                {user.fullName?.split(" ")[0]}
              </span>
              <Link
                href="/settings"
                aria-label="Settings"
                className="text-[--color-text-tertiary] transition-colors hover:text-[--color-text-secondary]"
              >
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.764-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button
                onClick={logout}
                className="text-[13px] text-[--color-text-tertiary] transition-colors hover:text-[--color-text-secondary]"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Back link below nav */}
      {backLink && (
        <div className="mx-auto max-w-[1080px] px-6 sm:px-6 px-4 pt-3">
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-1 text-[14px] text-[--color-text-tertiary] transition-colors hover:text-[--color-text-secondary]"
          >
            ← {backLink.label}
          </Link>
        </div>
      )}
    </>
  );
}
