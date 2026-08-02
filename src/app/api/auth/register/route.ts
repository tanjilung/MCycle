import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";

const registerSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
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

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        auditLogs: {
          create: {
            action: "REGISTER",
            metadata: { hasPassword: true },
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Only create managed person if one doesn't already exist for this user.
    const existingPerson = await tx.managedPerson.findFirst({
      where: { userId: createdUser.id },
    });
    if (!existingPerson) {
      await tx.managedPerson.create({
        data: {
          userId: createdUser.id,
          name,
          cycleDefaults: {
            create: {
              cycleLengthDays: 28,
              menstruationDays: 5,
              ovulationDays: 1,
              lutealDays: 14,
            },
          },
        },
      });
    }

    return createdUser;
  });

  return ok(user, { status: 201 });
}
