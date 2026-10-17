"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { kyivDay } from "@/lib/usageDay";

type Day = { day: string; testsFinished: number };

/** Vercel's own visitor statistics for this project (needs her Vercel login). */
const VERCEL_ANALYTICS_URL = "https://vercel.com/svitlana6/prepositions-app/analytics";

function daysAgo(n: number): string {
  return kyivDay(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
}

function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function UsagePage() {
  const [days, setDays] = useState<Day[] | null>(null);

  useEffect(() => {
    fetch("/api/teacher/usage")
      .then((res) => res.json())
      .then((data) => setDays(data.days ?? []))
      .catch(() => setDays([]));
  }, []);

  if (!days) return <p className="text-gray-500">Loading…</p>;

  const sumSince = (from: string) => days.filter((d) => d.day >= from).reduce((s, d) => s + d.testsFinished, 0);
  const today = sumSince(kyivDay());
  const week = sumSince(daysAgo(6));
  const month = sumSince(daysAgo(29));
  const allTime = sumSince("");
  const firstDay = days.length ? days[days.length - 1].day : null;

  const recent = Array.from({ length: 14 }, (_, i) => {
    const day = daysAgo(i);
    return { day, count: days.find((d) => d.day === day)?.testsFinished ?? 0 };
  });
  const max = Math.max(1, ...recent.map((r) => r.count));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Usage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tests finished by students (topic tests, Daily Mix, Fix Mistakes). Anonymous — only the
          number is counted.
          {firstDay && ` Counting since ${formatDay(firstDay)}.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Today", today],
          ["Last 7 days", week],
          ["Last 30 days", month],
          ["All time", allTime],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-3xl font-bold text-gray-900">{(value as number).toLocaleString("en-GB")}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-3 text-sm font-medium text-gray-900">Last 14 days</div>
        <div className="flex flex-col gap-1.5">
          {recent.map((r) => (
            <div key={r.day} className="flex items-center gap-3 text-sm">
              <span className="w-28 flex-none text-gray-500">{formatDay(r.day)}</span>
              <div className="h-3 flex-1 rounded-full bg-gray-100">
                <div className="h-3 rounded-full bg-blue-600" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
              <span className="w-10 flex-none text-right font-medium text-gray-900">{r.count}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium text-gray-900">Visitors</div>
        <p className="mt-1 text-sm text-gray-500">
          How many people open the app, from which countries and devices — in Vercel&apos;s
          statistics (last 30 days).
        </p>
        <a
          href={VERCEL_ANALYTICS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Open visitor statistics →
        </a>
      </Card>
    </div>
  );
}
