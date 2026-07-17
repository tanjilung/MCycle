import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { verifyAuthentication } from "@/lib/auth/webauthn";
import { applySessionCookie, createSession } from "@/lib/auth/session";

const schema = z.object({
  email: z.email(),
  response: z.unknown(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid payload", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (!user) {
    return fail("User not found", 404);
  }

  try {
    const verification = await verifyAuthentication(user.id, parsed.data.response);
    if (!verification.verified) {
      return fail("Passkey login failed", 401);
    }

    const token = await createSession(user.id);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        metadata: { method: "passkey" },
      },
    });

    const response = NextResponse.json({ ok: true, data: { method: "passkey" } });
    applySessionCookie(response, token);
    return response;
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Passkey login failed", 400);
  }
}
