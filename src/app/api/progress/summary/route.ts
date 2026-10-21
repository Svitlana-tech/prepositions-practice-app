import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isRateLimited, tooManyTries } from "@/lib/rateLimit";
import { isFreeFlowTopic, TOPIC_GROUPS, topicMenuName } from "@/lib/topics";

export type ProgressRow = {
  name: string;
  /** Matches PracticeSession's recordKey, for the "Beat yourself" times. */
  recordKey: string;
  mastered: number;
};

/**
 * Public: the My Progress screen's "mastered by topic", laid out like the menu (Everyday
 * group first, then the other topics). The phone sends its mastered ids — they live only
 * there — and gets back how many fall in each row.
 */
export async function POST(request: NextRequest) {
  if (await isRateLimited(request, "progressSummary")) return tooManyTries();
  const body = await request.json().catch(() => null);
  const masteredIds: string[] = Array.isArray(body?.masteredIds)
    ? body.masteredIds.filter((id: unknown): id is string => typeof id === "string").slice(0, 20000)
    : [];

  const [categories, mastered] = await Promise.all([
    prisma.category.findMany({
      where: { tasks: { some: { isPublished: true, inBank: true } } },
      select: { id: true, name: true },
    }),
    masteredIds.length
      ? prisma.task.groupBy({
          by: ["categoryId"],
          where: { id: { in: masteredIds }, isPublished: true, inBank: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);
  const masteredIn = new Map(mastered.map((m) => [m.categoryId, m._count._all]));
  const topics = categories.filter((c) => !isFreeFlowTopic(c.name));

  const rows: ProgressRow[] = [];
  const grouped = new Set<string>();
  for (const [key, group] of Object.entries(TOPIC_GROUPS)) {
    const members = topics.filter((c) => group.topics.includes(c.name));
    if (members.length === 0) continue;
    members.forEach((c) => grouped.add(c.id));
    rows.push({
      name: group.name,
      recordKey: `group:${key}`,
      mastered: members.reduce((sum, c) => sum + (masteredIn.get(c.id) ?? 0), 0),
    });
  }
  // The rest in menu order: Phrasal Verbs, then Academic, then anything added later.
  const order = (name: string) => (name === "Phrasal Verbs" ? 0 : topicMenuName(name) !== name ? 1 : 2);
  for (const c of topics
    .filter((c) => !grouped.has(c.id))
    .sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name))) {
    rows.push({
      name: topicMenuName(c.name),
      recordKey: `topic:${c.id}`,
      mastered: masteredIn.get(c.id) ?? 0,
    });
  }

  return NextResponse.json({ rows });
}
