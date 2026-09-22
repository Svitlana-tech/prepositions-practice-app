import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isTaskType } from "@/lib/taskTypes";

const SESSION_SIZE = 10;

/**
 * Public: pick up to 10 random published questions of one type. A session is
 * always scoped to a question type; `categoryId` narrows it further to one topic,
 * and omitting it means "all topics of this type mixed". When started from
 * inside a section without a specific topic, `sectionId` keeps "mixed" scoped
 * to that section's topics instead of every topic of the type app-wide.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const taskType = body?.taskType;
  const categoryId = typeof body?.categoryId === "string" && body.categoryId ? body.categoryId : null;
  const sectionId = typeof body?.sectionId === "string" && body.sectionId ? body.sectionId : null;

  if (!isTaskType(taskType)) {
    return NextResponse.json({ error: "Choose a question type first" }, { status: 400 });
  }

  const pool = await prisma.task.findMany({
    where: {
      isPublished: true,
      inBank: true,
      type: taskType,
      ...(categoryId ? { categoryId } : sectionId ? { category: { sectionId } } : {}),
    },
    select: { id: true },
  });

  if (pool.length === 0) {
    return NextResponse.json({ error: "There are no questions here yet" }, { status: 404 });
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const taskIds = shuffled.slice(0, SESSION_SIZE).map((t) => t.id);

  return NextResponse.json({ taskIds });
}
