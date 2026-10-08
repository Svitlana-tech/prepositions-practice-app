/**
 * The id of the site's only section, remembered after the first visit so /tasks can go
 * straight to its menu instead of asking the server for the section list every time.
 * Forgotten as soon as the menu finds it gone or no longer the only one.
 */
const STORAGE_KEY = "onlySectionId";

export function getOnlySectionId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setOnlySectionId(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

export function forgetOnlySectionId(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
