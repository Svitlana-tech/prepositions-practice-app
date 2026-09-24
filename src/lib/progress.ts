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
