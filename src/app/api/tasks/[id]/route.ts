import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sanitizePayloadForStudent } from "@/lib/sanitize";
import type { TaskType } from "@/lib/taskSchemas";

/** Public: fetch a single published task with the answer key stripped, for the student player. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });

  if (!task || !task.isPublished) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: task.id,
    type: task.type,
    title: task.title,
    instructions: task.instructions,
    points: task.points,
    payload: sanitizePayloadForStudent(task.type as TaskType, task.payload),
  });
}
