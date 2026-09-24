import { readStudentIds, writeStudentValue } from "@/lib/studentStorage";

/**
 * Tasks the current student has already been shown in the current cycle. New sessions
 * draw unseen tasks first; once a topic runs out, practice/start tells the client which
 * ids to forget so that topic starts a fresh cycle (see forgetSeen).
 */
const STORE = "seen";

export function getSeenIds(): string[] {
  return readStudentIds(STORE);
}

export function markSeen(taskId: string): void {
  const ids = getSeenIds();
  if (!ids.includes(taskId)) writeStudentValue(STORE, [...ids, taskId]);
}

export function forgetSeen(taskIds: string[]): void {
  if (taskIds.length === 0) return;
  const forget = new Set(taskIds);
  writeStudentValue(STORE, getSeenIds().filter((id) => !forget.has(id)));
}
