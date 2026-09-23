const STORAGE_KEY = "onboardingSeen";

export function getOnboardingSeen(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setOnboardingSeen(): void {
  window.localStorage.setItem(STORAGE_KEY, "1");
}
