import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { taskTypeSchemas, pointsForPayload, type TaskType } from "@/lib/taskSchemas";
import { checkCategoryMatchesType } from "@/lib/categories";
import { checkTaskDuplicate } from "@/lib/dedupe";
import { lintTaskContent } from "@/lib/contentLint";

/** Protected (middleware): full task (including answer key) for the edit form. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, include: { explanationEntry: true } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json({ task });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const type = body?.type as TaskType | undefined;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const instructions = typeof body?.instructions === "string" ? body.instructions : null;
  const isPublished = body?.isPublished !== false;
  const categoryId = typeof body?.categoryId === "string" && body.categoryId ? body.categoryId : null;
  const explanation = typeof body?.explanation === "string" && body.explanation.trim() ? body.explanation.trim() : null;
  const explanationEntryId =
    typeof body?.explanationEntryId === "string" && body.explanationEntryId ? body.explanationEntryId : null;

  if (!type || !(type in taskTypeSchemas)) {
    return NextResponse.json({ error: "Invalid task type" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const categoryError = await checkCategoryMatchesType(categoryId, type);
  if (categoryError) {
    return NextResponse.json({ error: categoryError }, { status: 400 });
  }

  const parsed = taskTypeSchemas[type].safeParse(body?.payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }

  const duplicateError = await checkTaskDuplicate(categoryId, type, parsed.data, id);
  if (duplicateError) {
    return NextResponse.json({ error: duplicateError }, { status: 409 });
  }

  if (explanationEntryId) {
    const entryExists = await prisma.explanationEntry.findUnique({ where: { id: explanationEntryId } });
    if (!entryExists) {
      return NextResponse.json({ error: "That explanation rule doesn't exist anymore" }, { status: 400 });
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      type,
      title,
      instructions,
      isPublished,
      categoryId,
      explanation,
      explanationEntryId,
      points: pointsForPayload(type, parsed.data),
      payload: parsed.data,
    },
  });

  const warnings = lintTaskContent(type, parsed.data, title);
  return NextResponse.json({ task, warnings });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.attempt.deleteMany({ where: { taskId: id } });
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
