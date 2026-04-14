import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth-helpers";

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearAuthCookies(response);
}
