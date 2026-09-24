import { getStoredStudentName } from "@/lib/studentName";

/**
 * The "Fix Mistakes" pool: ids of tasks the current student got wrong, kept in this
 * browser only (there are no student accounts — same as the stored name). Keyed per
 * student name so kids sharing one device each keep their own list. A task leaves the
 * pool once it's answered correctly on the first try, wherever that happens.
 */
function storageKey(): string | null {
  const name = getStoredStudentName();
  return name ? `mistakes:${name}` : null;
}

export function getMistakeIds(): string[] {
  try {
    const key = storageKey();
    const raw = key ? window.localStorage.getItem(key) : null;
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function save(ids: string[]): void {
  try {
    const key = storageKey();
    if (key) window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage blocked (private mode etc.) — the pool just doesn't persist.
  }
}

export function addMistake(taskId: string): void {
  const ids = getMistakeIds();
  if (!ids.includes(taskId)) save([...ids, taskId]);
}

export function removeMistake(taskId: string): void {
  const ids = getMistakeIds();
  if (ids.includes(taskId)) save(ids.filter((id) => id !== taskId));
}

/** Records one first-try result: wrong adds the task to the pool, right takes it out. */
export function recordFirstTry(taskId: string, correct: boolean): void {
  if (correct) removeMistake(taskId);
  else addMistake(taskId);
}
