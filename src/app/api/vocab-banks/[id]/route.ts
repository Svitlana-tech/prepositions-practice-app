import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Public: a bank's name and words, for the student exercise-picker and flashcard session. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bank = await prisma.vocabBank.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      words: { select: { id: true, ukrainian: true, answers: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });
  return NextResponse.json({ bank });
}
