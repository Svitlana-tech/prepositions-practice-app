"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Report = {
  id: string;
  taskId: string | null;
  sentence: string;
  correctAnswer: string | null;
  chosen: string | null;
  comment: string;
  studentName: string | null;
  createdAt: string;
};

/** The sentence with its right answer in the gap, the answer in bold green. */
function Sentence({ text, answer }: { text: string; answer: string | null }) {
  const [before, after] = text.split("{gap1}");
  if (after === undefined) return <>{text}</>;
  return (
    <>
      {before}
      <b className="text-green-700">{answer === "—" ? "(no word)" : answer ?? "___"}</b>
      {after}
    </>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/teacher/reports")
      .then((res) => res.json())
      .then((data) => setReports(data.reports ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markDone(id: string) {
    setReports((list) => list.filter((r) => r.id !== id));
    await fetch(`/api/teacher/reports/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Reports</h1>
      <p className="mb-6 text-sm text-gray-500">
        Notes students sent with &quot;Report a problem&quot; under a question. Fix the question if
        needed, then press Done to remove the note.
      </p>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-500">No reports right now.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r) => (
            <Card key={r.id}>
              <div className="mb-2 text-xs text-gray-400">
                {new Date(r.createdAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {r.studentName ? ` · ${r.studentName}` : ""}
              </div>
              <p className="text-gray-900">
                <Sentence text={r.sentence} answer={r.correctAnswer} />
              </p>
              {r.chosen && (
                <p className="mt-1 text-sm text-gray-500">
                  Student picked: <b>{r.chosen === "—" ? "(no word)" : r.chosen}</b>
                </p>
              )}
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-amber-50 px-3 py-2 text-gray-800">
                {r.comment}
              </p>
              <div className="mt-3 flex gap-2">
                {r.taskId ? (
                  <Link href={`/teacher/tasks/${r.taskId}/edit`}>
                    <Button variant="secondary">Edit question</Button>
                  </Link>
                ) : (
                  <span className="self-center text-sm text-gray-400">Question was deleted</span>
                )}
                <Button onClick={() => markDone(r.id)}>Done</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
