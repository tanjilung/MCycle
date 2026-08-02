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
  if (!name) return new NextResponse("Name is required", { status: 400 });

  const person = await prisma.managedPerson.create({
    data: {
      userId,
      name,
    },
  });

  return NextResponse.json(person);
}
