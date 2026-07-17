import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { applySessionCookie, createSession } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid login payload", 400);
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return fail("Invalid email or password", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return fail("Invalid email or password", 401);
  }

  const token = await createSession(user.id);

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "LOGIN",
      metadata: { method: "password" },
    },
  });

  const response = NextResponse.json({ ok: true, data: { method: "password" } });
  applySessionCookie(response, token);
  return response;
}
