import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Public: every non-empty vocab bank with its word count, for the student bank list. */
export async function GET() {
  const banks = await prisma.vocabBank.findMany({
    where: { words: { some: {} } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { words: true } } },
  });
  return NextResponse.json({
    banks: banks.map((b) => ({ id: b.id, name: b.name, wordCount: b._count.words })),
  });
}
