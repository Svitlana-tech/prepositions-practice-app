import { readStudentIds, readStudentValue, writeStudentValue } from "@/lib/studentStorage";

/** Points for each question answered right on the first try. */
export const POINTS_PER_CORRECT = 10;

type Streak = { lastDay: string; days: number };

export type SessionProgress = {
  /** Consecutive days with at least one finished session, today included. */
  streakDays: number;
  /** True when this was the day's first finished session (the streak just grew or restarted). */
  firstToday: boolean;
  pointsEarned: number;
  totalPoints: number;
};

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * Called once when a session finishes: advances the daily streak, adds the points, and
 * on a perfect session files its tasks under "mastered". All browser-only, per student
 * (see studentStorage).
 */
export function recordFinishedSession(taskIds: string[], correctCount: number): SessionProgress {
  const now = new Date();
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  const streak = readStudentValue<Streak | null>("streak", null);
  const firstToday = streak?.lastDay !== today;
  const days = !firstToday ? streak!.days : streak?.lastDay === yesterday ? streak.days + 1 : 1;
  writeStudentValue<Streak>("streak", { lastDay: today, days });

  const pointsEarned = correctCount * POINTS_PER_CORRECT;
  const totalPoints = readStudentValue<number>("points", 0) + pointsEarned;
  writeStudentValue("points", totalPoints);

  if (taskIds.length > 0 && correctCount === taskIds.length) {
    const mastered = new Set(readStudentIds("mastered"));
    taskIds.forEach((id) => mastered.add(id));
    writeStudentValue("mastered", [...mastered]);
  }

  return { streakDays: days, firstToday, pointsEarned, totalPoints };
}

export type TimeResult = {
  /** This session's thinking time, in whole seconds. */
  seconds: number;
  /** The record before this session, or null when this is the first one. */
  previousBest: number | null;
  isNewRecord: boolean;
};

/**
 * "Beat yourself": the best time for a flawless session, kept per kind of session
 * (`recordKey`) and per number of questions — a topic with fewer than 10 sentences gives a
 * shorter session, which isn't compared with a full one. Only called for perfect sessions.
 */
export function recordSessionTime(recordKey: string, questionCount: number, thinkingMs: number): TimeResult {
  const seconds = Math.max(1, Math.round(thinkingMs / 1000));
  const key = `${recordKey}:${questionCount}`;
  const bests = readStudentValue<Record<string, number>>("bestTimes", {});
  const previousBest = typeof bests[key] === "number" ? bests[key] : null;
  const isNewRecord = previousBest === null || seconds < previousBest;
  if (isNewRecord) writeStudentValue("bestTimes", { ...bests, [key]: seconds });
  return { seconds, previousBest, isNewRecord };
}
