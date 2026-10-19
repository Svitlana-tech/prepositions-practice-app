import { getStoredStudentName } from "@/lib/studentName";
import { noteStudentChange } from "@/lib/progressSync";

/**
 * Per-student values kept in this browser (keyed by name so kids sharing one device each keep
 * their own). A student with a secret code also gets them copied to the server — see
 * progressSync. Every read/write tolerates blocked storage (private mode etc.) — nothing
 * persists then, but nothing breaks either.
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

/** Writes without telling progressSync — for progressSync itself and device-only values.
 *  null removes the value. */
export function storeStudentValue<T>(name: string, value: T | null): void {
  try {
    const k = key(name);
    if (!k) return;
    if (value === null) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, JSON.stringify(value));
  } catch {
    // Storage blocked — just don't persist.
  }
}

export function writeStudentValue<T>(name: string, value: T): void {
  storeStudentValue(name, value);
  noteStudentChange(name);
}

export function readStudentIds(name: string): string[] {
  const ids = readStudentValue<unknown>(name, []);
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}
