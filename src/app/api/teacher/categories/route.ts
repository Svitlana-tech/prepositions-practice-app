import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isTaskType } from "@/lib/taskTypes";
import type { TaskType } from "@/lib/taskSchemas";

/**
 * Protected (middleware): topics for the teacher's topic manager.
 * `?taskType=FILL_IN_SENTENCE` narrows the list to the topics of one question type,
 * which is what the question forms need.
 */
export async function GET(request: NextRequest) {
  const taskTypeParam = request.nextUrl.searchParams.get("taskType");
  let taskType: TaskType | undefined;
  if (taskTypeParam) {
    if (!isTaskType(taskTypeParam)) {
      return NextResponse.json({ error: "Invalid question type" }, { status: 400 });
    }
    taskType = taskTypeParam;
  }

  const categories = await prisma.category.findMany({
    where: taskType ? { taskType } : undefined,
    include: { _count: { select: { tasks: true } }, section: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

/** Protected (middleware): create a topic inside one question type. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const taskType = body?.taskType;
  const sectionId = typeof body?.sectionId === "string" && body.sectionId ? body.sectionId : null;

  if (!isTaskType(taskType)) {
    return NextResponse.json({ error: "Choose a question type for this topic" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Topic name is required" }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({
    where: { taskType_name: { taskType, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This question type already has a topic with that name" },
      { status: 400 }
    );
  }

  const category = await prisma.category.create({ data: { name, taskType, sectionId } });
  return NextResponse.json({ category }, { status: 201 });
}
