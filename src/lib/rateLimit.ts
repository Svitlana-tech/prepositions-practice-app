import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Spam guard for the public POSTs: "not more than N per minute (hour, day) from one device".
 * Kept in the database, not in memory, because Vercel runs many copies of the server at once.
 * Limits are generous on purpose — a whole class on the school Wi-Fi shares one address.
 */
type Window = "m" | "h" | "d";
const WINDOW_MS: Record<Window, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };

export const LIMITS = {
  progressCreate: { m: 30, d: 200 },
  progressLoad: { m: 60 },
  /** Wrong codes only — stops someone guessing other students' codes. */
  progressWrongCode: { h: 30 },
  progressSave: { m: 120 },
  progressDelete: { m: 10 },
  progressSummary: { m: 60 },
  reports: { m: 5, d: 50 },
  testFinished: { m: 60 },
} satisfies Record<string, Partial<Record<Window, number>>>;

export type LimitName = keyof typeof LIMITS;

/** A salted hash of the phone's internet address: enough to tell devices apart for a day,
 *  useless for finding out who or where anyone is. */
function deviceOf(request: NextRequest): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.TEACHER_PASSWORD ?? "";
  return createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 32);
}

/** Counts this request against the rule; true when the device is over any of its limits.
 *  If the database can't be reached the request is let through (the route fails anyway). */
export async function isRateLimited(request: NextRequest, name: LimitName): Promise<boolean> {
  return checkLimit(request, name, true);
}

/** Like isRateLimited, but only looks — for the wrong-code rule, which counts failures
 *  (countWrongCode) yet must also stop the next try, right or wrong. */
export async function isOverLimit(request: NextRequest, name: LimitName): Promise<boolean> {
  return checkLimit(request, name, false);
}

export async function countWrongCode(request: NextRequest): Promise<void> {
  await checkLimit(request, "progressWrongCode", true);
}

async function checkLimit(request: NextRequest, name: LimitName, count: boolean): Promise<boolean> {
  const device = deviceOf(request);
  const now = Date.now();
  try {
    const over = await Promise.all(
      (Object.entries(LIMITS[name]) as [Window, number][]).map(async ([window, max]) => {
        const slot = Math.floor(now / WINDOW_MS[window]);
        const key = `${name}:${window}:${slot}:${device}`;
        if (!count) {
          const row = await prisma.rateLimit.findUnique({ where: { key }, select: { count: true } });
          return (row?.count ?? 0) >= max;
        }
        const row = await prisma.rateLimit.upsert({
          where: { key },
          create: { key, expiresAt: new Date((slot + 1) * WINDOW_MS[window]) },
          update: { count: { increment: 1 } },
          select: { count: true },
        });
        return row.count > max;
      }),
    );
    // Now and then, clear out windows that are over.
    if (count && Math.random() < 0.02) {
      await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
    }
    return over.some(Boolean);
  } catch {
    return false;
  }
}

export function tooManyTries(): NextResponse {
  return NextResponse.json(
    { error: "Too many tries. Wait a minute and try again." },
    { status: 429, headers: { "Retry-After": "60" } },
  );
}
