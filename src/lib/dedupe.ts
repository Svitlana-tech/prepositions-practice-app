import { prisma } from "@/lib/db";
import type { TaskType } from "@/lib/taskSchemas";

/**
 * Normalizes text for duplicate comparison: case-, whitespace-, and
 * punctuation-insensitive, so "Хто ходить?" and "хто ходить" match.
 */
export function normalizeForDedupe(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** The single payload field each task type uses as its distinguishing content. */
function taskContentText(type: TaskType, payload: unknown): string {
  const p = payload as Record<string, unknown> | null;
  if (!p) return "";
  switch (type) {
    case "FILL_IN_SENTENCE":
    case "FILL_IN_TEXT":
      return typeof p.text === "string" ? p.text : "";
  }
}

/**
 * Duplicate check is scoped to a single topic (categories are already scoped to one
 * task type each — see checkCategoryMatchesType) and never compares across topics.
 */
export async function checkTaskDuplicate(
  categoryId: string | null,
  type: TaskType,
  payload: unknown,
  excludeTaskId?: string
): Promise<string | null> {
  if (!categoryId) return null;
  const content = taskContentText(type, payload);
  const normalized = normalizeForDedupe(content);
  if (!normalized) return null;

  const existing = await prisma.task.findMany({
    where: { categoryId, ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}) },
    select: { type: true, payload: true },
  });
  const isDuplicate = existing.some(
    (task) => normalizeForDedupe(taskContentText(task.type, task.payload)) === normalized
  );
  return isDuplicate ? "This task already exists in this topic" : null;
}
