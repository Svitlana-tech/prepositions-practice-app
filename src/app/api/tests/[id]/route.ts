import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Public: the fixed, ordered question list for a shared test link. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  return NextResponse.json({
    id: test.id,
    title: test.title,
    taskIds: Array.isArray(test.taskIds) ? test.taskIds : [],
    mode: test.mode,
  });
}
