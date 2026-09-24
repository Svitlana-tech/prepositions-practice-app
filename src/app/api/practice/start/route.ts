import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isTaskType } from "@/lib/taskTypes";
import { shuffle } from "@/lib/shuffle";

const SESSION_SIZE = 10;

/** Daily Mix: on top of SESSION_SIZE questions spread evenly over the topics,
 *  up to this many of the student's own mistakes (sent by the client), from any topic. */
const MIX_MISTAKES = 2;
/** Topics practiced only on their own, never pulled into the mix's topic questions. */
const MIX_EXCLUDED_TOPIC_NAMES = ["Academic Writing", "Prepositions"];

/**
 * Public: build one practice session of a question type. With `categoryId` it's up
 * to 10 random questions from that topic. Without it, it's the Daily Mix:
 * 10 random questions spread evenly over the topics (scoped to `sectionId` when
 * given, minus MIX_EXCLUDED_TOPIC_NAMES), plus up to MIX_MISTAKES ids picked from
 * `mistakeTaskIds` — the student's Fix Mistakes pool, which only lives in their browser.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const taskType = body?.taskType;
  const categoryId = typeof body?.categoryId === "string" && body.categoryId ? body.categoryId : null;
  const sectionId = typeof body?.sectionId === "string" && body.sectionId ? body.sectionId : null;
  const mistakeTaskIds: string[] = Array.isArray(body?.mistakeTaskIds)
    ? body.mistakeTaskIds.filter((id: unknown): id is string => typeof id === "string").slice(0, 500)
    : [];

  if (!isTaskType(taskType)) {
    return NextResponse.json({ error: "Choose a question type first" }, { status: 400 });
  }

  const pool = await prisma.task.findMany({
    where: {
      isPublished: true,
      inBank: true,
      type: taskType,
      ...(categoryId
        ? { categoryId }
        : {
            category: {
              name: { notIn: MIX_EXCLUDED_TOPIC_NAMES },
              ...(sectionId ? { sectionId } : {}),
            },
          }),
    },
    select: { id: true, categoryId: true },
  });

  if (pool.length === 0) {
    return NextResponse.json({ error: "There are no questions here yet" }, { status: 404 });
  }

  if (categoryId) {
    const taskIds = shuffle(pool).slice(0, SESSION_SIZE).map((t) => t.id);
    return NextResponse.json({ taskIds });
  }

  // Deal one question per topic per round, topics in random order, until 10 are
  // drawn — so four topics give 2–3 each, and a small topic that runs out just
  // leaves its turn to the others.
  const byTopic = new Map<string | null, string[]>();
  for (const t of shuffle(pool)) {
    byTopic.set(t.categoryId, [...(byTopic.get(t.categoryId) ?? []), t.id]);
  }
  const queues = shuffle([...byTopic.values()]);
  const picked: string[] = [];
  while (picked.length < SESSION_SIZE && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const id = q.shift();
      if (id && picked.length < SESSION_SIZE) picked.push(id);
    }
  }

  // Mistakes can come from any topic, excluded ones included — only still-published
  // tasks of this type (and section) not already drawn above.
  const candidates = mistakeTaskIds.filter((id) => !picked.includes(id));
  const eligible = candidates.length
    ? await prisma.task.findMany({
        where: {
          id: { in: candidates },
          isPublished: true,
          inBank: true,
          type: taskType,
          ...(sectionId ? { category: { sectionId } } : {}),
        },
        select: { id: true },
      })
    : [];
  const mistakes = shuffle(eligible.map((t) => t.id)).slice(0, MIX_MISTAKES);

  return NextResponse.json({ taskIds: shuffle([...picked, ...mistakes]) });
}
