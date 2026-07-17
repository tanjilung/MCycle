import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { verifyRegistration } from "@/lib/auth/webauthn";

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
    const verification = await verifyRegistration(user.id, parsed.data.response);
    if (!verification.verified) {
      return fail("Passkey verification failed", 401);
    }

    return ok({ verified: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Passkey verification failed", 400);
  }
}
