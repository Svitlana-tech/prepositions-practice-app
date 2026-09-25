import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AVAILABLE_TASK_TYPES } from "@/lib/taskTypes";
import { isFreeFlowTopic } from "@/lib/topics";

/**
 * Public: the student menu, question type first. Each playable type reports how
 * many published questions it has and which of its topics currently have any.
 * A type with questions but no topics is normal — students just practice the
 * whole type. `?sectionId=` scopes everything to one section, for the
 * per-section browse page.
 */
export async function GET(request: NextRequest) {
  const sectionId = request.nextUrl.searchParams.get("sectionId") || undefined;
  const playableTypes = AVAILABLE_TASK_TYPES.map((t) => t.type);

  const [categories, countsByType, cardsCountsByCategory] = await Promise.all([
    prisma.category.findMany({
      where: {
        taskType: { in: playableTypes },
        tasks: { some: { isPublished: true, inBank: true } },
        ...(sectionId ? { sectionId } : {}),
      },
      select: {
        id: true,
        name: true,
        taskType: true,
        _count: { select: { tasks: { where: { isPublished: true, inBank: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.task.groupBy({
      by: ["type"],
      where: {
        isPublished: true,
        inBank: true,
        type: { in: playableTypes },
        ...(sectionId ? { category: { sectionId } } : {}),
      },
      _count: { _all: true },
    }),
    // How many published FILL_IN_SENTENCE tasks per topic are cards-mode — the Free Flow
    // topic (the only endless one) only gets the full-screen deck if every task qualifies,
    // otherwise it falls back to the usual 10-question session like every other topic.
    prisma.task.groupBy({
      by: ["categoryId"],
      where: {
        isPublished: true,
        inBank: true,
        type: "FILL_IN_SENTENCE",
        categoryId: { not: null },
        payload: { path: ["displayMode"], equals: "cards" },
      },
      _count: { _all: true },
    }),
  ]);

  const totalByType = new Map(countsByType.map((row) => [row.type, row._count._all]));
  const cardsCountByCategoryId = new Map(cardsCountsByCategory.map((row) => [row.categoryId, row._count._all]));

  const types = AVAILABLE_TASK_TYPES.map((info) => ({
    type: info.type,
    label: info.label,
    description: info.description,
    totalCount: totalByType.get(info.type) ?? 0,
    topics: categories
      .filter((c) => c.taskType === info.type)
      .map((c) => ({
        id: c.id,
        name: c.name,
        count: c._count.tasks,
        endless:
          isFreeFlowTopic(c.name) &&
          info.type === "FILL_IN_SENTENCE" &&
          cardsCountByCategoryId.get(c.id) === c._count.tasks,
      })),
  })).filter((t) => t.totalCount > 0);

  return NextResponse.json({ types });
}
