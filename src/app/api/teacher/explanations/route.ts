import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Protected (middleware): the reusable long-explanation bank, for the picker in
 *  FillInBlankForm and the standalone management page. */
export async function GET() {
  const entries = await prisma.explanationEntry.findMany({
    include: { _count: { select: { tasks: true } } },
    orderBy: { label: "asc" },
  });
  return NextResponse.json({ entries });
}

/** Protected (middleware): add a new reusable rule to the bank. */
export async function POST(request: NextRequest) {
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
  if (existing) {
    return NextResponse.json(
      { error: `A rule named "${label}" already exists — pick it from the list instead.` },
      { status: 409 }
    );
  }

  const entry = await prisma.explanationEntry.create({ data: { label, text } });
  return NextResponse.json({ entry }, { status: 201 });
}
