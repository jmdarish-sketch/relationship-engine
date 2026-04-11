import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth/hash";

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Check if email already exists
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const password_hash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      email: email.toLowerCase().trim(),
      name: name?.trim() || null,
      password_hash,
    })
    .select("id, email, name, onboarding_completed")
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    user_id: user.id,
    email: user.email,
    name: user.name,
    onboarding_completed: user.onboarding_completed,
  });
}
