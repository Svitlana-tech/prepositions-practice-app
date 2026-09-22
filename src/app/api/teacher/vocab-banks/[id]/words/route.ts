import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { vocabWordInputSchema } from "@/lib/vocabSchemas";
import { checkVocabWordDuplicate } from "@/lib/dedupe";

/** Protected (middleware): add one word to a bank. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bank = await prisma.vocabBank.findUnique({ where: { id }, select: { id: true } });
  if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = vocabWordInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }

  const duplicateError = await checkVocabWordDuplicate(id, parsed.data.ukrainian);
  if (duplicateError) {
    return NextResponse.json({ error: duplicateError }, { status: 409 });
  }

  const word = await prisma.vocabWord.create({
    data: { bankId: id, ukrainian: parsed.data.ukrainian, answers: parsed.data.answers },
  });
  return NextResponse.json({ word }, { status: 201 });
}
