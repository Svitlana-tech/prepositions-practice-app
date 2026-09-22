import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gradeAttempt } from "@/lib/grading";
import type { FillInBlankPayload, TaskType } from "@/lib/taskSchemas";

/**
 * What to reveal to the student after checking one question — never the whole
 * answer key up front, just enough to explain a wrong answer once they've tried it.
 */
function revealFor(type: TaskType, payload: unknown): unknown {
  switch (type) {
    case "FILL_IN_SENTENCE":
    case "FILL_IN_TEXT":
      return {
        correctAnswers: Object.fromEntries(
          (payload as FillInBlankPayload).gaps.map((g) => [g.id, g.correctAnswer])
        ),
      };
  }
}

/** Public: grade a single question for instant feedback during a practice session. Nothing is persisted here. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const taskId = typeof body?.taskId === "string" ? body.taskId : null;
  const answers =
    body?.answers && typeof body.answers === "object"
      ? (body.answers as Record<string, string | number>)
      : null;

  if (!taskId || !answers) {
    return NextResponse.json({ error: "taskId and answers are required" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { explanationEntry: true } });
  if (!task || !task.isPublished) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const type = task.type as TaskType;
  const result = gradeAttempt(type, task.payload, { answers });

  return NextResponse.json({
    score: result.score,
    maxScore: result.maxScore,
    perGapResults: result.perGapResults,
    reveal: revealFor(type, task.payload),
    // A rule linked from the explanation bank takes priority over the task's own short
    // explanation — see ExplanationEntry in schema.prisma for why.
    explanation: task.explanationEntry ? task.explanationEntry.text : task.explanation,
    explanationIsLong: !!task.explanationEntry,
  });
}
