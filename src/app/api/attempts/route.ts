import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gradeAttempt } from "@/lib/grading";
import type { TaskType } from "@/lib/taskSchemas";

/** Public: a student submits their answers for a task; grading happens here, server-side. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const taskId = typeof body?.taskId === "string" ? body.taskId : null;
  const studentName = typeof body?.studentName === "string" ? body.studentName.trim() : "";
  const answers = body?.answers ?? {};

  if (!taskId || !studentName) {
    return NextResponse.json({ error: "taskId and studentName are required" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || !task.isPublished) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const result = gradeAttempt(task.type as TaskType, task.payload, answers);

  const attempt = await prisma.attempt.create({
    data: {
      studentName,
      taskId,
      score: result.score,
      maxScore: result.maxScore,
      answers: { submitted: answers, perGapResults: result.perGapResults },
    },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    score: result.score,
    maxScore: result.maxScore,
    perGapResults: result.perGapResults,
  });
}
