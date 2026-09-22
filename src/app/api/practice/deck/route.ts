import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isTaskType } from "@/lib/taskTypes";

/**
 * Public: every published task id of one type/topic, uncapped — the pool an endless
 * practice deck (e.g. the preposition cards grid) shuffles and draws from client-side, as
 * opposed to practice/start's fixed 10-question session.
 */
export async function GET(request: NextRequest) {
  const taskType = request.nextUrl.searchParams.get("type");
  const categoryId = request.nextUrl.searchParams.get("categoryId");

  if (!isTaskType(taskType)) {
    return NextResponse.json({ error: "Choose a question type first" }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { isPublished: true, inBank: true, type: taskType, categoryId },
    select: { id: true },
  });

  return NextResponse.json({ taskIds: tasks.map((t) => t.id) });
}
