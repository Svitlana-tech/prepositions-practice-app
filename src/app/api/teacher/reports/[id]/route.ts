import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Protected (middleware): the teacher has dealt with a report — remove it from the list. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.problemReport.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
