import { readStudentValue, storeStudentValue } from "@/lib/studentStorage";

/**
 * The secret code (her pick "2B", 2026-10-19): a student who asks for a code gets their
 * progress copied to the server under it, so it survives a new phone and works on two.
 * Nothing about the student goes with it — not even the nickname, which stays on the phone.
 * Whichever copy (phone or server) was changed last wins.
 */
const SYNCED_VALUES = ["points", "streak", "mastered", "bestTimes", "mistakes", "seen"];
const CODE = "secretCode";
/** When the synced values last changed on this phone (ms). */
const CHANGED_AT = "changedAt";
/** The day "Not now" was tapped on the results screen's code offer. */
const OFFER_SKIPPED = "codeOfferSkipped";
const SAVE_DELAY_MS = 2000;

export type SavedProgress = { v: 1; updatedAt: number; values: Record<string, unknown> };

export function getSecretCode(): string | null {
  return readStudentValue<string | null>(CODE, null);
}

function collect(): SavedProgress {
  const values: Record<string, unknown> = {};
  for (const name of SYNCED_VALUES) {
    const value = readStudentValue<unknown>(name, null);
    if (value !== null) values[name] = value;
  }
  return { v: 1, updatedAt: readStudentValue<number>(CHANGED_AT, 0), values };
}

function apply(saved: SavedProgress): void {
  for (const name of SYNCED_VALUES) storeStudentValue(name, saved.values[name] ?? null);
  storeStudentValue(CHANGED_AT, saved.updatedAt);
}

function isSaved(data: unknown): data is SavedProgress {
  const d = data as SavedProgress | null;
  return !!d && typeof d.updatedAt === "number" && !!d.values && typeof d.values === "object";
}

async function post(path: string, body: unknown, keepalive = false): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive,
  });
}

let saveTimer: number | null = null;

/** Called by writeStudentValue: a synced value changed, so the server copy is refreshed soon
 *  (a couple of seconds later, so one answer's several writes go as one request). */
export function noteStudentChange(name: string): void {
  if (!SYNCED_VALUES.includes(name)) return;
  storeStudentValue(CHANGED_AT, Date.now());
  if (!getSecretCode() || typeof window === "undefined") return;
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveNow(), SAVE_DELAY_MS);
}

/** Sends this phone's copy to the server now. keepalive lets it finish while the page closes. */
export async function saveNow(): Promise<void> {
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = null;
  const code = getSecretCode();
  if (!code) return;
  try {
    const res = await post("/api/progress/save", { code, data: collect() }, true);
    if (res.status === 404) {
      // The save was deleted (on another phone): this phone keeps its progress, without a code.
      if (getSecretCode() === code) storeStudentValue(CODE, null);
      return;
    }
    // The server had a newer copy (another phone) — take it.
    const body = await res.json().catch(() => null);
    if (isSaved(body?.data) && getSecretCode() === code) apply(body.data);
  } catch {
    // Offline — the next change or the next menu visit tries again.
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (saveTimer !== null) void saveNow();
  });
}

/** On the menu: brings in progress made on another phone. True when this phone's values
 *  changed (the menu then re-reads points and mistakes). */
export async function syncOnOpen(): Promise<boolean> {
  const code = getSecretCode();
  if (!code) return false;
  try {
    const res = await post("/api/progress/load", { code });
    if (res.status === 404) {
      if (getSecretCode() === code) storeStudentValue(CODE, null);
      return false;
    }
    const body = await res.json().catch(() => null);
    if (!isSaved(body?.data) || getSecretCode() !== code) return false;
    const local = collect();
    if (body.data.updatedAt > local.updatedAt) {
      apply(body.data);
      return true;
    }
    if (local.updatedAt > body.data.updatedAt) void saveNow();
    return false;
  } catch {
    return false;
  }
}

/** "Get my code": a new code with this phone's progress saved under it. Throws when offline. */
export async function createSecretCode(): Promise<string> {
  const res = await post("/api/progress/create", { data: collect() });
  const body = await res.json().catch(() => null);
  if (!res.ok || typeof body?.code !== "string") throw new Error("No code");
  storeStudentValue(CODE, body.code);
  return body.code;
}

/** "I already have a code": the progress saved under it, or null when there's no such code.
 *  Throws when offline. */
export async function findSave(code: string): Promise<SavedProgress | null> {
  const res = await post("/api/progress/load", { code });
  if (res.status === 404) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok || !isSaved(body?.data)) throw new Error("Load failed");
  return body.data;
}

/** After the nickname is stored: this phone takes over the found progress and its code. */
export function adoptSave(code: string, saved: SavedProgress): void {
  apply(saved);
  storeStudentValue(CODE, code.trim().toUpperCase());
}

/** "Delete my progress": the server copy and this student's values on this phone. */
export async function deleteMyProgress(): Promise<void> {
  const code = getSecretCode();
  if (code) {
    const res = await post("/api/progress/delete", { code });
    if (!res.ok) throw new Error("Delete failed");
  }
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = null;
  for (const name of [...SYNCED_VALUES, CODE, CHANGED_AT, OFFER_SKIPPED]) storeStudentValue(name, null);
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** The results screen offers a code to a student without one; "Not now" hides it for the day. */
export function shouldOfferCode(): boolean {
  return !getSecretCode() && readStudentValue<string | null>(OFFER_SKIPPED, null) !== today();
}

export function skipCodeOffer(): void {
  storeStudentValue(OFFER_SKIPPED, today());
}
