import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MAX_COMMENT = 1000;

/** Public: a student's "Report a problem" note about one question. The sentence and its
 *  answer are copied from the task here, server-side, not taken from the request. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const taskId = typeof body?.taskId === "string" ? body.taskId : null;
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, MAX_COMMENT) : "";
  const chosen = typeof body?.chosen === "string" && body.chosen ? body.chosen.slice(0, 40) : null;
  const studentName =
    typeof body?.studentName === "string" && body.studentName.trim()
      ? body.studentName.trim().slice(0, 60)
      : null;

  if (!taskId || !comment) {
    return NextResponse.json({ error: "Write what's wrong first." }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const payload = task.payload as { text?: string; gaps?: { correctAnswer?: string }[] };
  await prisma.problemReport.create({
    data: {
      taskId,
      sentence: payload.text ?? task.title,
      correctAnswer: payload.gaps?.[0]?.correctAnswer ?? null,
      chosen,
      comment,
      studentName,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
