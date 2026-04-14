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

          {/* Right: user + logout */}
          {showUser && user && (
            <div className="flex items-center gap-4">
              <span className="text-[13px] text-[--color-text-secondary]">
                {user.fullName?.split(" ")[0]}
              </span>
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
