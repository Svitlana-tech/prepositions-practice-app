import { prisma } from "@/lib/db";
import type { TaskType } from "@/lib/taskSchemas";

/**
 * Topics are scoped to a question type, so a question may only be filed under a
 * topic of its own type. Returns an error message, or null when the pairing is fine.
 */
export async function checkCategoryMatchesType(
  categoryId: string | null,
  type: TaskType
): Promise<string | null> {
  if (!categoryId) return null;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return "Topic not found";
  if (category.taskType !== type) return "That topic belongs to a different question type";
  return null;
}
