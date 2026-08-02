import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const people = await prisma.managedPerson.findMany({
    where: { userId: session.userId },
  });

  return NextResponse.json(people);
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { name } = await request.json();
  if (!name) return new NextResponse("Name is required", { status: 400 });

  const person = await prisma.managedPerson.create({
    data: {
      userId: session.userId,
      name,
    },
  });

  return NextResponse.json(person);
}
