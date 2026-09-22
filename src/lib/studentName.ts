const STORAGE_KEY = "studentName";

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
