import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FREE_FLOW_TOPIC_NAMES, freeFlowWeight } from "@/lib/topics";

/**
 * Public: the pool Free Flow draws from — every published cards task, grouped by topic,
 * each topic with its draw weight (see freeFlowWeight). The client picks a topic by
 * weight, then the next unseen task within it, so topics come up about equally often
 * no matter how many sentences each one has.
 */
export async function GET() {
  const tasks = await prisma.task.findMany({
    where: {
      isPublished: true,
      inBank: true,
      type: "FILL_IN_SENTENCE",
      payload: { path: ["displayMode"], equals: "cards" },
      category: { name: { notIn: FREE_FLOW_TOPIC_NAMES } },
    },
    select: { id: true, categoryId: true, category: { select: { name: true } } },
  });

  const groups = new Map<string, { topicId: string; weight: number; taskIds: string[] }>();
  for (const t of tasks) {
    if (!t.categoryId || !t.category) continue;
    const group = groups.get(t.categoryId) ?? {
      topicId: t.categoryId,
      weight: freeFlowWeight(t.category.name),
      taskIds: [],
    };
    group.taskIds.push(t.id);
    groups.set(t.categoryId, group);
  }

  return NextResponse.json({ groups: [...groups.values()] });
}
