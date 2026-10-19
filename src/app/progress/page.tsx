"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredStudentName } from "@/lib/studentName";
import { readStudentIds, readStudentValue } from "@/lib/studentStorage";
import { getMistakeIds } from "@/lib/mistakes";
import { getLevel, type LevelInfo } from "@/lib/levels";
import { InfoHeading, InfoPage } from "@/components/student/InfoPage";
import { Spinner } from "@/components/ui/Spinner";
import type { ProgressRow } from "@/app/api/progress/summary/route";

/** Records are kept per session length (see recordSessionTime); the screen shows full tests. */
const FULL_TEST = 10;

type Streak = { lastDay: string; days: number };

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** The streak still counts if the last finished test was today or yesterday. */
function currentStreak(): number {
  const streak = readStudentValue<Streak | null>("streak", null);
  if (!streak) return 0;
  const now = new Date();
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  return streak.lastDay === dayKey(now) || streak.lastDay === yesterday ? streak.days : 0;
}

/** 38 → "38 sec", 75 → "1 min 15 sec" (same as the results screen). */
function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const min = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${min} min` : `${min} min ${rest} sec`;
}

const num = (n: number) => n.toLocaleString("en-GB");

type Local = {
  points: number;
  level: LevelInfo;
  streak: number;
  mastered: string[];
  toFix: number;
  bestTimes: Record<string, number>;
};

/** My Progress (her pick "B", 2026-10-19): opened by tapping the title line on the menu. */
export default function ProgressPage() {
  const router = useRouter();
  const [local, setLocal] = useState<Local | null>(null);
  const [rows, setRows] = useState<ProgressRow[] | null>(null);

  useEffect(() => {
    if (!getStoredStudentName()) {
      router.replace("/");
      return;
    }
    const points = readStudentValue<number>("points", 0);
    const mastered = readStudentIds("mastered");
    setLocal({
      points,
      level: getLevel(points),
      streak: currentStreak(),
      mastered,
      toFix: getMistakeIds().length,
      bestTimes: readStudentValue<Record<string, number>>("bestTimes", {}),
    });
    fetch("/api/progress/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masteredIds: mastered }),
    })
      .then((res) => res.json())
      .then((data) => setRows(Array.isArray(data.rows) ? data.rows : []))
      .catch(() => setRows([]));
  }, [router]);

  if (!local) return null;

  const { level, bestTimes } = local;
  const timeOf = (recordKey: string) => {
    const t = bestTimes[`${recordKey}:${FULL_TEST}`];
    return typeof t === "number" ? t : null;
  };
  const allTimes = Object.entries(bestTimes)
    .filter(([key, t]) => key.endsWith(`:${FULL_TEST}`) && typeof t === "number")
    .map(([, t]) => t);
  const bestTime = allTimes.length ? Math.min(...allTimes) : null;
  const timeRows = [{ name: "Daily Mix", recordKey: "mix" }, ...(rows ?? [])];

  return (
    <InfoPage>
      {/* Title card */}
      <div className="mt-3 flex flex-col gap-2.5 rounded-[18px] p-[18px] text-white" style={{ background: "#1565C0" }}>
        <div className="text-[13px] opacity-85">Your title</div>
        <div className="text-[30px] leading-tight font-bold">🧭 {level.name}</div>
        <div className="h-2 overflow-hidden rounded-full bg-white/30">
          <div className="h-full rounded-full bg-white" style={{ width: `${Math.round(level.progress * 100)}%` }} />
        </div>
        <div className="flex justify-between gap-2 text-[13px]">
          <span>{num(local.points)} points</span>
          <span>{level.next ? `${num(level.next.pointsLeft)} to ${level.next.name}` : "The top title!"}</span>
        </div>
      </div>

      {/* Four tiles */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Tile value={String(local.streak)} label={local.streak === 1 ? "day in a row" : "days in a row"} bg="#FEF3C7" color="#B45309" ink="#78350F" />
        <Tile value={num(local.mastered.length)} label="sentences mastered" bg="#E8F5EC" color="#15803D" ink="#14532D" />
        <Tile value={num(local.toFix)} label="to fix" bg="#FDF6EC" color="#B45309" ink="#78350F" />
        <Tile value={bestTime === null ? "—" : formatSeconds(bestTime)} label="best time (10 / 10)" bg="#E3F2FD" color="#1565C0" ink="#1E3A5F" />
      </div>

      <InfoHeading>Mastered by topic</InfoHeading>
      {rows === null ? (
        <Spinner />
      ) : (
        // Just the counts — no bars or totals: the topics keep growing, so a share of them
        // would only look emptier over time (her call, 2026-10-19).
        <div className="flex flex-col gap-2 text-[15px]">
          {rows.map((r) => (
            <div key={r.recordKey} className="flex justify-between gap-2">
              <span>{r.name}</span>
              <b style={{ color: r.mastered > 0 ? "#15803D" : "#5C6378" }}>{num(r.mastered)}</b>
            </div>
          ))}
          <p className="text-[13px] text-[#5C6378]">A sentence is mastered when it&apos;s part of a 10 / 10 test.</p>
        </div>
      )}

      <InfoHeading>Best times (10 / 10)</InfoHeading>
      <div className="flex flex-col gap-2 text-[15px]">
        {timeRows.map((r) => {
          const t = timeOf(r.recordKey);
          return (
            <div key={r.recordKey} className="flex justify-between gap-2" style={{ color: t === null ? "#5C6378" : undefined }}>
              <span>{r.name}</span>
              {t === null ? <span>not yet</span> : <b>{formatSeconds(t)}</b>}
            </div>
          );
        })}
      </div>
    </InfoPage>
  );
}

function Tile({ value, label, bg, color, ink }: { value: string; label: string; bg: string; color: string; ink: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl p-3.5" style={{ background: bg }}>
      <div className="text-[28px] leading-tight font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[13px]" style={{ color: ink }}>
        {label}
      </div>
    </div>
  );
}
