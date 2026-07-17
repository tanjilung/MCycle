import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status },
  );
}
