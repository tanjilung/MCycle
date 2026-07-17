import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import {
  clearSessionCookie,
  deleteCurrentSession,
  getCurrentUserId,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: "ACCOUNT_DELETED",
    },
  });

  await prisma.user.delete({ where: { id: userId } });
  await deleteCurrentSession();

  const response = NextResponse.json({ ok: true, data: { deleted: true } });
  clearSessionCookie(response);
  return response;
}
