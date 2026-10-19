const STORAGE_KEY = "studentName";

/** Long enough for any nickname, short enough to fit the menu greeting on a small phone. */
export const NICKNAME_MAX = 20;

export function getStoredStudentName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredStudentName(name: string): void {
  window.localStorage.setItem(STORAGE_KEY, name);
}

export function clearStoredStudentName(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
