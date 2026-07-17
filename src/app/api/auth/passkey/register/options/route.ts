import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getRegistrationOptions } from "@/lib/auth/webauthn";

const schema = z.object({ email: z.email() });

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

  const options = await getRegistrationOptions(user.id, parsed.data.email);
  return ok(options);
}
