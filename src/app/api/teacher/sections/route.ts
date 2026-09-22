import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Protected (proxy): every section, ordered, for the teacher's section manager. */
export async function GET() {
  const sections = await prisma.section.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { categories: true } } },
  });
  return NextResponse.json({ sections });
}

/** Protected (proxy): create a new section, appended after the current highest order. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Section name is required" }, { status: 400 });
  }

  const existing = await prisma.section.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "A section with that name already exists" }, { status: 400 });
  }

  const last = await prisma.section.findFirst({ orderBy: { order: "desc" } });
  const section = await prisma.section.create({
    data: { name, order: (last?.order ?? -1) + 1 },
  });
  return NextResponse.json({ section }, { status: 201 });
}
