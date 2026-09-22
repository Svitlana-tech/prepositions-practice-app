import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Protected (middleware): every vocab bank with its word count, for the bank list. */
export async function GET() {
  const banks = await prisma.vocabBank.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      sectionId: true,
      section: { select: { id: true, name: true } },
      _count: { select: { words: true } },
    },
  });
  return NextResponse.json({
    banks: banks.map((b) => ({
      id: b.id,
      name: b.name,
      createdAt: b.createdAt,
      sectionId: b.sectionId,
      section: b.section,
      wordCount: b._count.words,
    })),
  });
}

/** Protected (middleware): create an empty bank — words are added afterwards. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const sectionId = typeof body?.sectionId === "string" && body.sectionId ? body.sectionId : null;
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const bank = await prisma.vocabBank.create({ data: { name, sectionId } });
  return NextResponse.json({ bank }, { status: 201 });
}
