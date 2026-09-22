"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Question = { taskId: string; title: string };
type AttemptDetail = { title: string; given: string[]; correct: string[] };
type AttemptRow = {
  id: string;
  studentName: string;
  score: number;
  maxScore: number;
  createdAt: string;
  perQuestion: (boolean | null)[];
  details: AttemptDetail[];
};

export default function TestResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState<string | null>(null);
  const [mode, setMode] = useState<"SELF_CHECK" | "TEACHER_REVIEW" | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/teacher/tests/${params.id}/results`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        setTitle(data.test.title);
        setMode(data.test.mode);
        setQuestions(data.questions ?? []);
        setAttempts(data.attempts ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [params.id]);

  async function handleClearResults() {
    setBusy(true);
    await fetch(`/api/teacher/tests/${params.id}/results`, { method: "DELETE" });
    setBusy(false);
    setConfirmClear(false);
    load();
  }

  async function handleDeleteTest() {
    setBusy(true);
    await fetch(`/api/teacher/tests/${params.id}`, { method: "DELETE" });
    router.push("/teacher/tests");
  }

  if (notFound) return <p className="text-red-600">Test not found.</p>;
  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <Link href="/teacher/tests" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to Tests
      </Link>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {mode === "SELF_CHECK" ? "Self-check" : "Sent to teacher"}
        </span>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Green = correct, red = incorrect. Click &quot;Details&quot; on a row to see exactly what the
        student answered — for questions with several blanks, each answer lines up with its correct
        answer on the same row.
      </p>

      {attempts.length === 0 && <p className="mb-6 text-gray-500">No one has taken this test yet.</p>}

      {attempts.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Questions</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <Fragment key={a.id}>
                  <tr className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-gray-900">{a.studentName}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {a.score} / {a.maxScore}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {a.perQuestion.map((correct, i) => (
                          <span
                            key={i}
                            title={`Question ${i + 1}${questions[i] ? `: ${questions[i].title}` : ""} — ${
                              correct === null ? "not answered" : correct ? "correct" : "incorrect"
                            }`}
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white ${
                              correct === null ? "bg-gray-300" : correct ? "bg-green-500" : "bg-red-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(a.createdAt).toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        {expandedId === a.id ? "Hide" : "Details"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === a.id && (
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 text-left text-gray-500">
                                <th className="px-3 py-1.5">#</th>
                                <th className="px-3 py-1.5">Question</th>
                                <th className="px-3 py-1.5">Student answered</th>
                                <th className="px-3 py-1.5">Correct answer</th>
                              </tr>
                            </thead>
                            <tbody>
                              {a.details.map((d, i) => {
                                const rowCount = Math.max(d.given.length, d.correct.length, 1);
                                return (
                                  <tr key={i} className="border-b border-gray-100 last:border-0">
                                    <td className="px-3 py-1.5 text-gray-500">{i + 1}</td>
                                    <td className="px-3 py-1.5 text-gray-900">{d.title}</td>
                                    <td className="px-3 py-1.5">
                                      <div className="flex flex-col gap-1">
                                        {Array.from({ length: rowCount }, (_, gi) => {
                                          const given = d.given[gi] ?? "—";
                                          const isMatch = given === d.correct[gi];
                                          return (
                                            <span
                                              key={gi}
                                              className={isMatch ? "text-green-700" : "text-red-700"}
                                            >
                                              {given}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <div className="flex flex-col gap-1 text-green-700">
                                        {Array.from({ length: rowCount }, (_, gi) => (
                                          <span key={gi}>{d.correct[gi] ?? ""}</span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
        {attempts.length > 0 &&
          (confirmClear ? (
            <>
              <span className="self-center text-sm text-gray-600">
                Delete all {attempts.length} result{attempts.length === 1 ? "" : "s"}? The test link
                keeps working.
              </span>
              <Button variant="secondary" onClick={() => setConfirmClear(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleClearResults} disabled={busy}>
                Yes, clear results
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmClear(true)}>
              Clear results
            </Button>
          ))}
        {confirmDelete ? (
          <>
            <span className="self-center text-sm text-gray-600">
              Delete this test and its results page for good?
            </span>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteTest} disabled={busy}>
              Yes, delete test
            </Button>
          </>
        ) : (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete test
          </Button>
        )}
      </div>
    </div>
  );
}
