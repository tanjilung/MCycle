import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";

const registerSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid registration payload", 400);
  }

  const { email, name, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return fail("Email is already registered", 409);
  }

  const passwordHash = password ? await hashPassword(password) : null;

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      cycleDefaults: {
        create: {
          cycleLengthDays: 28,
          menstruationDays: 5,
          ovulationDays: 1,
          lutealDays: 14,
        },
      },
      auditLogs: {
        create: {
          action: "REGISTER",
          metadata: {
            hasPassword: Boolean(passwordHash),
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return ok(user, { status: 201 });
}
