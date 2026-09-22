import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { taskTypeSchemas, pointsForPayload, type TaskType } from "@/lib/taskSchemas";
import { checkCategoryMatchesType } from "@/lib/categories";
import { checkTaskDuplicate } from "@/lib/dedupe";
import { lintTaskContent } from "@/lib/contentLint";

/** Protected (middleware): full task list including unpublished, for the teacher dashboard. Excludes questions written directly inside a test, which never join the shared bank. */
export async function GET() {
  const tasks = await prisma.task.findMany({
    where: { inBank: true },
    select: {
      id: true,
      type: true,
      title: true,
      points: true,
      isPublished: true,
      createdAt: true,
      categoryId: true,
      category: { select: { name: true } },
      payload: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tasks });
}

/** Protected (middleware): create a new task after validating its type-specific payload. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const type = body?.type as TaskType | undefined;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const instructions = typeof body?.instructions === "string" ? body.instructions : null;
  const isPublished = body?.isPublished !== false;
  const inBank = body?.inBank !== false;
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

  const duplicateError = await checkTaskDuplicate(categoryId, type, parsed.data);
  if (duplicateError) {
    return NextResponse.json({ error: duplicateError }, { status: 409 });
  }

  if (explanationEntryId) {
    const entryExists = await prisma.explanationEntry.findUnique({ where: { id: explanationEntryId } });
    if (!entryExists) {
      return NextResponse.json({ error: "That explanation rule doesn't exist anymore" }, { status: 400 });
    }
  }

  const task = await prisma.task.create({
    data: {
      type,
      title,
      instructions,
      isPublished,
      inBank,
      categoryId,
      explanation,
      explanationEntryId,
      points: pointsForPayload(type, parsed.data),
      payload: parsed.data,
    },
  });

  const warnings = lintTaskContent(type, parsed.data, title);
  return NextResponse.json({ task, warnings }, { status: 201 });
}
