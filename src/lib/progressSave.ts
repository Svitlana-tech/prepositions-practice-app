import type { Prisma } from "@prisma/client";

/** Biggest progress blob accepted — the "seen" list for every sentence is far below this. */
const MAX_BYTES = 200_000;

export type SavedProgress = { v: 1; updatedAt: number; values: Record<string, unknown> };

/** Checks a progress blob sent by a student's phone; null when it isn't one. */
export function parseSavedProgress(input: unknown): SavedProgress | null {
  const data = input as Partial<SavedProgress> | null;
  if (!data || typeof data !== "object") return null;
  if (typeof data.updatedAt !== "number" || !Number.isFinite(data.updatedAt)) return null;
  if (!data.values || typeof data.values !== "object" || Array.isArray(data.values)) return null;
  const saved: SavedProgress = { v: 1, updatedAt: data.updatedAt, values: data.values };
  if (JSON.stringify(saved).length > MAX_BYTES) return null;
  return saved;
}

export function toJson(saved: SavedProgress): Prisma.InputJsonValue {
  return saved as unknown as Prisma.InputJsonValue;
}
