import { readStudentIds, writeStudentValue } from "@/lib/studentStorage";

/**
 * The "Fix Mistakes" pool: ids of tasks the current student got wrong (see
 * studentStorage — browser-only, per student name). A task leaves the pool once it's
 * answered correctly on the first try, wherever that happens.
 */
const STORE = "mistakes";

export function getMistakeIds(): string[] {
  return readStudentIds(STORE);
}

export function addMistake(taskId: string): void {
  const ids = getMistakeIds();
  if (!ids.includes(taskId)) writeStudentValue(STORE, [...ids, taskId]);
}

export function removeMistake(taskId: string): void {
  const ids = getMistakeIds();
  if (ids.includes(taskId)) writeStudentValue(STORE, ids.filter((id) => id !== taskId));
}

/** Records one first-try result: wrong adds the task to the pool, right takes it out. */
export function recordFirstTry(taskId: string, correct: boolean): void {
  if (correct) removeMistake(taskId);
  else addMistake(taskId);
}
