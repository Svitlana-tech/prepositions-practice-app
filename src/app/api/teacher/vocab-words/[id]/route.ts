import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { vocabWordInputSchema } from "@/lib/vocabSchemas";
import { checkVocabWordDuplicate } from "@/lib/dedupe";

/** Protected (middleware): edit one word's Ukrainian text or accepted English answers. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.vocabWord.findUnique({ where: { id }, select: { bankId: true } });
  if (!existing) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = vocabWordInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }

  const duplicateError = await checkVocabWordDuplicate(existing.bankId, parsed.data.ukrainian, id);
  if (duplicateError) {
    return NextResponse.json({ error: duplicateError }, { status: 409 });
  }

  const word = await prisma.vocabWord.update({
    where: { id },
    data: { ukrainian: parsed.data.ukrainian, answers: parsed.data.answers },
  });
  return NextResponse.json({ word });
}

/** Protected (middleware): remove one word from its bank. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.vocabWord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
