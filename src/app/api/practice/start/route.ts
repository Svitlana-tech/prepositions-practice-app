import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isTaskType } from "@/lib/taskTypes";
import { shuffle } from "@/lib/shuffle";
import { ACADEMIC_TOPIC_NAME, FREE_FLOW_TOPIC_NAMES } from "@/lib/topics";

const SESSION_SIZE = 10;

/** Daily Mix: on top of SESSION_SIZE questions spread evenly over the topics,
 *  up to this many of the student's own mistakes (sent by the client), from any topic. */
const MIX_MISTAKES = 2;
/** Topics practiced only on their own, never pulled into the mix's topic questions. */
const MIX_EXCLUDED_TOPIC_NAMES = [ACADEMIC_TOPIC_NAME, ...FREE_FLOW_TOPIC_NAMES];

/**
 * Public: build one practice session of a question type. With `categoryId` it's up
 * to 10 random questions from that topic. Without it, it's the Daily Mix:
 * 10 random questions spread evenly over the topics (scoped to `sectionId` when
 * given, minus MIX_EXCLUDED_TOPIC_NAMES), plus up to MIX_MISTAKES ids picked from
 * `mistakeTaskIds` — the student's Fix Mistakes pool, which only lives in their browser.
 *
 * No repeats until a topic runs out: `seenTaskIds` (also browser-only) is what this
 * student has already been shown, and unseen tasks are always drawn first. When a
 * topic has too few unseen left, the rest is filled from its seen tasks and those ids
 * come back in `forgetSeenIds` — the client forgets them, starting that topic's next cycle.
 * The unseen leftovers drawn alongside close the old cycle, so they come back in
 * `lastOfCycleIds` and the client doesn't count them as seen in the new one.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const taskType = body?.taskType;
  const categoryId = typeof body?.categoryId === "string" && body.categoryId ? body.categoryId : null;
  const sectionId = typeof body?.sectionId === "string" && body.sectionId ? body.sectionId : null;
  const mistakeTaskIds: string[] = Array.isArray(body?.mistakeTaskIds)
    ? body.mistakeTaskIds.filter((id: unknown): id is string => typeof id === "string").slice(0, 500)
    : [];
  const seen = new Set<string>(
    Array.isArray(body?.seenTaskIds)
      ? body.seenTaskIds.filter((id: unknown): id is string => typeof id === "string").slice(0, 20000)
      : []
  );

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

  const forgetSeenIds: string[] = [];
  const lastOfCycleIds: string[] = [];
  /** One topic's draw order: unseen first; if fewer than `need` are unseen, its seen
   *  tasks follow and are all forgotten (the topic's cycle restarts). */
  function unseenFirst(ids: string[], need: number): string[] {
    const unseen = shuffle(ids.filter((id) => !seen.has(id)));
    if (unseen.length >= need) return unseen;
    const seenHere = ids.filter((id) => seen.has(id));
    forgetSeenIds.push(...seenHere);
    lastOfCycleIds.push(...unseen);
    return [...unseen, ...shuffle(seenHere)];
  }

  if (categoryId) {
    const taskIds = unseenFirst(
      pool.map((t) => t.id),
      SESSION_SIZE
    ).slice(0, SESSION_SIZE);
    return NextResponse.json({ taskIds, forgetSeenIds, lastOfCycleIds });
  }

  // Deal one question per topic per round, topics in random order, until 10 are
  // drawn — so four topics give 2–3 each, and a small topic that runs out just
  // leaves its turn to the others.
  const byTopic = new Map<string | null, string[]>();
  for (const t of pool) {
    byTopic.set(t.categoryId, [...(byTopic.get(t.categoryId) ?? []), t.id]);
  }
  const perTopic = Math.ceil(SESSION_SIZE / byTopic.size);
  const queues = shuffle([...byTopic.values()].map((ids) => unseenFirst(ids, perTopic)));
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

  return NextResponse.json({ taskIds: shuffle([...picked, ...mistakes]), forgetSeenIds, lastOfCycleIds });
}
