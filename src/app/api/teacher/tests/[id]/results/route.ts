import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type PerTaskResult = { taskId: string; correct: boolean };
type QuestionDetail = { taskId: string; title: string; given: string[]; correct: string[] };

/** Protected (middleware): every attempt at one test, with a per-question correct/wrong breakdown
 * and, where available, the exact given-vs-correct answer text for a detailed review table. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const taskIds = Array.isArray(test.taskIds) ? (test.taskIds as string[]) : [];
  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    select: { id: true, title: true },
  });
  const titleById = new Map(tasks.map((t) => [t.id, t.title]));
  const questions = taskIds.map((tid, i) => ({ taskId: tid, title: titleById.get(tid) ?? `Question ${i + 1}` }));

  const attempts = await prisma.attempt.findMany({
    where: { testId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, studentName: true, score: true, maxScore: true, createdAt: true, answers: true },
  });

  const rows = attempts.map((a) => {
    const answers = a.answers as { perTaskResults?: PerTaskResult[]; questionDetails?: QuestionDetail[] } | null;
    const perTaskResults = answers?.perTaskResults ?? [];
    const correctByTaskId = new Map(perTaskResults.map((r) => [r.taskId, r.correct]));
    const detailsByTaskId = new Map((answers?.questionDetails ?? []).map((d) => [d.taskId, d]));
    return {
      id: a.id,
      studentName: a.studentName,
      score: a.score,
      maxScore: a.maxScore,
      createdAt: a.createdAt,
      perQuestion: taskIds.map((tid) => correctByTaskId.get(tid) ?? null),
      details: taskIds.map((tid, i) => {
        const d = detailsByTaskId.get(tid);
        return {
          title: d?.title ?? titleById.get(tid) ?? `Question ${i + 1}`,
          given: d?.given ?? [],
          correct: d?.correct ?? [],
        };
      }),
    };
  });

  return NextResponse.json({ test: { id: test.id, title: test.title, mode: test.mode }, questions, attempts: rows });
}

/** Protected (middleware): clear every attempt on this test, keeping the test and its link. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.attempt.deleteMany({ where: { testId: id } });
  return NextResponse.json({ ok: true });
}
