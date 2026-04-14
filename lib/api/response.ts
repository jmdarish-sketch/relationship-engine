import { NextResponse } from "next/server";
import type { PaginationMeta } from "@/types/api";

export function ok<T>(data: T, meta?: PaginationMeta) {
  return NextResponse.json(meta ? { data, meta } : { data });
}

export function err(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

export function badRequest(message: string, details?: unknown) {
  return err(message, 400, details);
}

export function notFound(message = "Not found") {
  return err(message, 404);
}

export function unauthorized(message = "Unauthorized") {
  return err(message, 401);
}
