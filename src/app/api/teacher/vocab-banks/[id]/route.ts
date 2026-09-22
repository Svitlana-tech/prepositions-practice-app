import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Protected (middleware): a bank plus every word in it, for the bank detail page. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bank = await prisma.vocabBank.findUnique({
    where: { id },
    include: { words: { orderBy: { createdAt: "asc" } } },
  });
  if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });
  return NextResponse.json({ bank });
}

/** Protected (middleware): rename a bank and/or move it to a different section. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const data: { name?: string; sectionId?: string | null } = {};
  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }
  if (body?.sectionId !== undefined) {
    data.sectionId = typeof body.sectionId === "string" && body.sectionId ? body.sectionId : null;
  }

  const bank = await prisma.vocabBank.update({ where: { id }, data });
  return NextResponse.json({ bank });
}

/** Protected (middleware): delete a bank and every word in it. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.vocabBank.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
