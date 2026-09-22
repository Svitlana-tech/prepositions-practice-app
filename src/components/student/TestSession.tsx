"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  SentenceQuestion,
  ClozeQuestion,
  TextMcqQuestion,
  FillInBlankQuestion,
  isClozePayload,
  isFillInBlankPayload,
  type QuestionPayload as Payload,
  type CurrentAnswers,
} from "@/components/student/QuestionRenderers";

type TestMode = "SELF_CHECK" | "TEACHER_REVIEW";

type QuestionDetail = { taskId: string; title: string; given: string[]; correct: string[] };

type SubmitResult = {
  score: number;
  maxScore: number;
  mode: TestMode;
  perTaskResults: { taskId: string; correct: boolean }[];
  /** Only present when mode is SELF_CHECK — a teacher-review test never reveals this to the student. */
  questionDetails?: QuestionDetail[];
};

/**
 * Plays a fixed, shared test question-by-question with no per-question feedback — that's
 * what makes it a test rather than practice. Everything is graded at once on Finish. What the
 * student sees afterwards depends on the mode the teacher picked when creating the test:
 * self-check reveals the score and corrections right away; teacher-review only confirms the
 * submission and keeps the details for the teacher's results page.
 */
export function TestSession({ testId, studentName }: { testId: string; studentName: string }) {
  const [title, setTitle] = useState<string | null>(null);
  const [taskIds, setTaskIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<CurrentAnswers>({});
  const [answers, setAnswers] = useState<Record<string, CurrentAnswers>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    fetch(`/api/tests/${testId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not load this test.");
        }
        return res.json();
      })
      .then((data) => {
        setTitle(data.title);
        setTaskIds(data.taskIds);
      })
      .catch((e) => setError(e.message));
  }, [testId]);

  useEffect(() => {
    if (!taskIds || index >= taskIds.length) return;
    const taskId = taskIds[index];
    setPayload(null);
    setInstructions(null);
    setCurrentAnswers(answers[taskId] ?? {});
    fetch(`/api/tasks/${taskId}`)
      .then((res) => res.json())
      .then((data) => {
        setPayload(data.payload);
        setInstructions(data.instructions ?? null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskIds, index]);

  const allGapsFilled =
    payload !== null &&
    ("sentence" in payload
      ? currentAnswers["1"] !== undefined
      : payload.gaps.every((g) => currentAnswers[g.id] !== undefined && currentAnswers[g.id] !== ""));

  function commitCurrentAnswers(): Record<string, CurrentAnswers> {
    if (!taskIds) return answers;
    const next = { ...answers, [taskIds[index]]: currentAnswers };
    setAnswers(next);
    return next;
  }

  function handleBack() {
    commitCurrentAnswers();
    setIndex((i) => Math.max(0, i - 1));
  }

  async function handleNext() {
    if (!taskIds || !allGapsFilled) return;
    const nextAnswers = commitCurrentAnswers();
    if (index + 1 < taskIds.length) {
      setIndex(index + 1);
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/tests/${testId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName, answers: nextAnswers }),
    });
    const data = await res.json();
    setSubmitting(false);
    setResult(data);
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (result) {
    if (result.mode === "TEACHER_REVIEW") {
      return (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="text-3xl">✅</div>
          <p className="text-lg font-medium text-gray-900">
            Thanks, {studentName}! Your answers were sent to your teacher.
          </p>
          <p className="text-sm text-gray-500">
            Your teacher will review the results — this test doesn&apos;t show a score right away.
          </p>
        </Card>
      );
    }

    const detailsByTaskId = new Map((result.questionDetails ?? []).map((d) => [d.taskId, d]));
    const incorrect = result.perTaskResults.filter((r) => !r.correct);

    return (
      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="text-3xl font-semibold text-gray-900">
          {result.score} / {result.maxScore}
        </div>
        <p className="text-gray-600">Done, {studentName}! Here&apos;s what you got right.</p>
        <div className="flex flex-wrap justify-center gap-2">
          {result.perTaskResults.map((r, i) => (
            <span
              key={r.taskId}
              title={`Question ${i + 1}: ${r.correct ? "correct" : "incorrect"}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white ${
                r.correct ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>

        {incorrect.length > 0 && (
          <div className="mt-2 w-full text-left">
            <div className="mb-2 text-sm font-medium text-gray-700">Corrections</div>
            <div className="flex flex-col gap-2">
              {incorrect.map((r) => {
                const i = result.perTaskResults.findIndex((x) => x.taskId === r.taskId);
                const detail = detailsByTaskId.get(r.taskId);
                return (
                  <div key={r.taskId} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                    <div className="font-medium text-gray-900">
                      Question {i + 1}
                      {detail ? `: ${detail.title}` : ""}
                    </div>
                    {detail && (
                      <div className="mt-1 text-gray-700">
                        Correct answer{detail.correct.length > 1 ? "s" : ""}:{" "}
                        <span className="font-medium text-green-700">{detail.correct.join(", ")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    );
  }

  if (!taskIds || !payload) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <div className="text-sm text-gray-500">
          Question {index + 1} of {taskIds.length}
        </div>
      </div>

      {"sentence" in payload ? (
        <SentenceQuestion
          payload={payload}
          selected={typeof currentAnswers["1"] === "number" ? (currentAnswers["1"] as number) : null}
          onSelect={(idx) => setCurrentAnswers({ "1": idx })}
          checkResult={null}
        />
      ) : isClozePayload(payload) ? (
        <ClozeQuestion
          payload={payload}
          answers={currentAnswers}
          onChange={(gapId, value) => setCurrentAnswers((prev) => ({ ...prev, [gapId]: value }))}
          checkResult={null}
        />
      ) : isFillInBlankPayload(payload) ? (
        <FillInBlankQuestion
          payload={payload}
          answers={currentAnswers}
          onChange={(gapId, value) => setCurrentAnswers((prev) => ({ ...prev, [gapId]: value }))}
          checkResult={null}
          instructions={instructions}
        />
      ) : (
        <TextMcqQuestion
          payload={payload}
          answers={currentAnswers}
          onChange={(gapId, value) => setCurrentAnswers((prev) => ({ ...prev, [gapId]: value }))}
          checkResult={null}
        />
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={handleBack} disabled={index === 0 || submitting}>
          ← Back
        </Button>
        <Button onClick={handleNext} disabled={!allGapsFilled || submitting}>
          {submitting ? "Submitting..." : index + 1 < taskIds.length ? "Next →" : "Finish test"}
        </Button>
      </div>
    </div>
  );
}
