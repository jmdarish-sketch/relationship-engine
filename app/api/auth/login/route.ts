import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/auth/hash";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, name, password_hash, onboarding_completed")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !user || !user.password_hash) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user_id: user.id,
    email: user.email,
    name: user.name,
    onboarding_completed: user.onboarding_completed,
  });
}
