import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Protected (middleware): a test plus its questions in order, for the edit form. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const taskIds = Array.isArray(test.taskIds) ? (test.taskIds as string[]) : [];
  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    select: {
      id: true,
      type: true,
      title: true,
      isPublished: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const questions = taskIds.map((tid) => byId.get(tid)).filter((t): t is NonNullable<typeof t> => !!t);

  return NextResponse.json({ test: { id: test.id, title: test.title, mode: test.mode, taskIds, questions } });
}

function parseMode(value: unknown): "SELF_CHECK" | "TEACHER_REVIEW" {
  return value === "SELF_CHECK" ? "SELF_CHECK" : "TEACHER_REVIEW";
}

/** Protected (middleware): rename a test, replace its question set/order, or change its mode. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const taskIds = Array.isArray(body?.taskIds)
    ? (body.taskIds as unknown[]).filter((tid): tid is string => typeof tid === "string")
    : [];
  const mode = parseMode(body?.mode);

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (taskIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one question" }, { status: 400 });
  }

  const found = await prisma.task.count({ where: { id: { in: taskIds }, isPublished: true } });
  if (found !== taskIds.length) {
    return NextResponse.json({ error: "Some selected questions no longer exist" }, { status: 400 });
  }

  const test = await prisma.test.update({ where: { id }, data: { title, taskIds, mode } });
  return NextResponse.json({ test });
}

/** Protected (middleware): delete a test. Past attempts are kept, with testId cleared. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.test.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
