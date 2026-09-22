import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gradeAttempt, describeCorrectAnswers, describeGivenAnswers } from "@/lib/grading";
import type { TaskType } from "@/lib/taskSchemas";

type QuestionDetail = {
  taskId: string;
  title: string;
  given: string[];
  correct: string[];
};

/**
 * Public: grade and persist one full attempt at a shared test. The question set and
 * order always come from the stored Test, never from the client, so a student can't
 * change what's graded by editing the request. Per-question detail (given vs. correct
 * answer text) is computed and frozen here, so it stays stable even if the task is
 * edited later, and is reused both for the student's self-check screen and the
 * teacher's results table.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const studentName = typeof body?.studentName === "string" ? body.studentName.trim() : "";
  // taskId -> { gapId -> answer }, one entry per gap of that task
  const answers = (body?.answers ?? {}) as Record<string, Record<string, string | number>>;

  if (!studentName) {
    return NextResponse.json({ error: "studentName is required" }, { status: 400 });
  }

  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const taskIds = Array.isArray(test.taskIds) ? (test.taskIds as string[]) : [];
  const tasks = await prisma.task.findMany({ where: { id: { in: taskIds }, isPublished: true } });
  const tasksById = new Map(tasks.map((t) => [t.id, t]));

  let score = 0;
  let maxScore = 0;
  const perTaskResults: { taskId: string; correct: boolean }[] = [];
  const questionDetails: QuestionDetail[] = [];

  for (const taskId of taskIds) {
    const task = tasksById.get(taskId);
    if (!task) {
      perTaskResults.push({ taskId, correct: false });
      questionDetails.push({ taskId, title: "(question no longer available)", given: [], correct: [] });
      continue;
    }
    const taskAnswers = { answers: answers[taskId] ?? {} };
    const result = gradeAttempt(task.type as TaskType, task.payload, taskAnswers);
    score += result.score;
    maxScore += result.maxScore;
    perTaskResults.push({ taskId, correct: result.score === result.maxScore });
    questionDetails.push({
      taskId,
      title: task.title,
      given: describeGivenAnswers(task.type as TaskType, task.payload, taskAnswers),
      correct: describeCorrectAnswers(task.type as TaskType, task.payload),
    });
  }

  const attempt = await prisma.attempt.create({
    data: {
      studentName,
      testId: test.id,
      taskIds,
      score,
      maxScore,
      answers: { submitted: answers, perTaskResults, questionDetails },
    },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    score,
    maxScore,
    perTaskResults,
    mode: test.mode,
    // Corrections are only meaningful to hand back on self-check tests — a
    // teacher-review test keeps them out of the response entirely.
    questionDetails: test.mode === "SELF_CHECK" ? questionDetails : undefined,
  });
}
