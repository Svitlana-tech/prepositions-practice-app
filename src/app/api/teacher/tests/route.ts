import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Protected (middleware): every test, with its question count, for the teacher's test list. */
export async function GET() {
  const tests = await prisma.test.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    tests: tests.map((t) => ({
      id: t.id,
      title: t.title,
      mode: t.mode,
      createdAt: t.createdAt,
      questionCount: Array.isArray(t.taskIds) ? t.taskIds.length : 0,
    })),
  });
}

function parseMode(value: unknown): "SELF_CHECK" | "TEACHER_REVIEW" {
  return value === "SELF_CHECK" ? "SELF_CHECK" : "TEACHER_REVIEW";
}

/** Protected (middleware): create a test from an ordered list of existing, published task ids. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const taskIds = Array.isArray(body?.taskIds)
    ? (body.taskIds as unknown[]).filter((id): id is string => typeof id === "string")
    : [];
  const mode = parseMode(body?.mode);

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (taskIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one question" }, { status: 400 });
  }

  const found = await prisma.task.count({ where: { id: { in: taskIds }, isPublished: true } });
  if (found !== taskIds.length) {
    return NextResponse.json({ error: "Some selected questions no longer exist" }, { status: 400 });
  }

  const test = await prisma.test.create({ data: { title, taskIds, mode } });
  return NextResponse.json({ test }, { status: 201 });
}
