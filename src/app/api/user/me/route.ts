import { fail, ok } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      cycleDefaults: true,
      _count: {
        select: {
          passkeys: true,
          cycles: true,
        },
      },
    },
  });

  if (!user) {
    return fail("Unauthorized", 401);
  }

  return ok(user);
}
