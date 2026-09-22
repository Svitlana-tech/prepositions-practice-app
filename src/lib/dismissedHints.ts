const STORAGE_KEY = "hideFillInInstructions";

/** Whether the student has dismissed the "type the missing word" instructions box for good. */
export function isFillInInstructionsDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function dismissFillInInstructions(): void {
  window.localStorage.setItem(STORAGE_KEY, "1");
}
