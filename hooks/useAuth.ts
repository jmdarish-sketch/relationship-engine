"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  onboardingCompleted: boolean;
  profileSummary: string | null;
}

export function useAuth({ redirectTo }: { redirectTo?: string } = {}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
        if (redirectTo) router.push(redirectTo);
      }
    } catch {
      setUser(null);
      if (redirectTo) router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  }, [redirectTo, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function login(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Login failed");
    }

    setUser(data.user);
    return data.user as AuthUser;
  }

  async function signup(email: string, password: string, fullName: string) {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Signup failed");
    }

    setUser(data.user);
    return data.user as AuthUser;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    checkAuth,
  };
}
