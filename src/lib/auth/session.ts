import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { addDays } from "date-fns";
import { SESSION_COOKIE, SESSION_MAX_AGE_DAYS } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt: addDays(new Date(), SESSION_MAX_AGE_DAYS),
    },
  });

  return rawToken;
}

export function applySessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!session || session.expiresAt < now) {
    if (session) {
      await prisma.authSession.delete({ where: { id: session.id } }).catch(() => {
        return;
      });
    }
    return null;
  }

  return session.userId;
}

export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }
  return userId;
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return;
  }

  const tokenHash = hashToken(token);
  await prisma.authSession.deleteMany({ where: { tokenHash } });
}
