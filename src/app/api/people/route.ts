import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const people = await prisma.managedPerson.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  // Set default as cookie
  const defaultId = people[0]?.id ?? null;
  const res = NextResponse.json(people);
  if (defaultId) {
    res.cookies.set("managedPersonId", defaultId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { name } = await request.json();
  if (!name) return new Response(JSON.stringify({ error: "Name is required" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const person = await prisma.managedPerson.create({
      data: {
        userId,
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
    return NextResponse.json(person, { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      return new Response(JSON.stringify({ error: "A person with this name already exists" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw err;
  }
}
