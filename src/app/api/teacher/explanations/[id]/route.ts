import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Protected (middleware): one rule, with how many tasks currently link to it. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = await prisma.explanationEntry.findUnique({
    where: { id },
    include: { _count: { select: { tasks: true } } },
  });
  if (!entry) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

/** Protected (middleware): edit a rule's wording — updates every task linked to it at once. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!label) {
    return NextResponse.json({ error: "Give this rule a short name" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "The rule text can't be empty" }, { status: 400 });
  }

  const existing = await prisma.explanationEntry.findUnique({ where: { label } });
  if (existing && existing.id !== id) {
    return NextResponse.json(
      { error: `A different rule is already named "${label}" — pick another name.` },
      { status: 409 }
    );
  }

  const entry = await prisma.explanationEntry.update({ where: { id }, data: { label, text } });
  return NextResponse.json({ entry });
}

/** Protected (middleware): remove a rule — tasks that linked to it fall back to their own
 *  short `explanation` text (if any) rather than breaking. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.explanationEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
