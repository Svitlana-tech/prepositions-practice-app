import { getStoredStudentName } from "@/lib/studentName";

/**
 * Per-student values kept in this browser only (there are no student accounts — same
 * as the stored name). Keyed by name so kids sharing one device each keep their own.
 * Every read/write tolerates blocked storage (private mode etc.) — nothing persists
 * then, but nothing breaks either.
 */
function key(name: string): string | null {
  const student = getStoredStudentName();
  return student ? `${name}:${student}` : null;
}

export function readStudentValue<T>(name: string, fallback: T): T {
  try {
    const k = key(name);
    const raw = k ? window.localStorage.getItem(k) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStudentValue<T>(name: string, value: T): void {
  try {
    const k = key(name);
    if (k) window.localStorage.setItem(k, JSON.stringify(value));
  } catch {
    // Storage blocked — just don't persist.
  }
}

export function readStudentIds(name: string): string[] {
  const ids = readStudentValue<unknown>(name, []);
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}
