"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { TaskType } from "@/lib/taskSchemas";
import {
  FillInBlankQuestion,
  type QuestionPayload as Payload,
  type CheckResult,
  type CurrentAnswers,
} from "@/components/student/QuestionRenderers";

export function PracticeSession({
  taskType,
  categoryId,
  sectionId = null,
}: {
  taskType: TaskType;
  /** A single topic of that type, or null for "all topics of this type mixed". */
  categoryId: string | null;
  /** The section this session was started from — keeps "mixed" (no categoryId) scoped
   *  to that section's topics instead of every topic of the type app-wide. */
  sectionId?: string | null;
}) {
  const [taskIds, setTaskIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<CurrentAnswers>({});
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [tally, setTally] = useState({ score: 0, maxScore: 0 });
  const [finalScore, setFinalScore] = useState<{ score: number; maxScore: number } | null>(null);

  useEffect(() => {
    fetch("/api/practice/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskType, categoryId, sectionId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not start the practice session.");
        }
        return res.json();
      })
      .then((data) => setTaskIds(data.taskIds))
      .catch((e) => setError(e.message));
  }, [taskType, categoryId, sectionId]);

  useEffect(() => {
    if (!taskIds || index >= taskIds.length) return;
    setPayload(null);
    setInstructions(null);
    setCurrentAnswers({});
    setCheckResult(null);
    fetch(`/api/tasks/${taskIds[index]}`)
      .then((res) => res.json())
      .then((data) => {
        setPayload(data.payload);
        setInstructions(data.instructions ?? null);
      });
  }, [taskIds, index]);

  const allGapsFilled =
    payload !== null &&
    payload.gaps.every((g) => currentAnswers[g.id] !== undefined && currentAnswers[g.id] !== "");

  async function handleCheck() {
    if (!taskIds || !allGapsFilled) return;
    const taskId = taskIds[index];
    const res = await fetch("/api/practice/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, answers: currentAnswers }),
    });
    const result: CheckResult = await res.json();
    setCheckResult(result);
    setTally((prev) => ({ score: prev.score + result.score, maxScore: prev.maxScore + result.maxScore }));
    if (result.score === result.maxScore) setCorrectCount((c) => c + 1);
  }

  function handleNext() {
    if (!taskIds) return;
    if (index + 1 < taskIds.length) {
      setIndex(index + 1);
      return;
    }
    setFinalScore(tally);
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-red-600">{error}</p>
        <Link href="/tasks" className="text-blue-600 hover:underline">
          ← Choose another exercise
        </Link>
      </div>
    );
  }

  if (finalScore) {
    return (
      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="text-3xl font-semibold text-gray-900">
          {finalScore.score} / {finalScore.maxScore}
        </div>
        <p className="text-gray-600">Done! Here&apos;s your result.</p>
        <Link href="/tasks">
          <Button>Choose another exercise</Button>
        </Link>
      </Card>
    );
  }

  if (!taskIds || !payload) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-sm text-gray-500">
        Question {index + 1} of {taskIds.length} · correct: {correctCount}
      </div>

      <FillInBlankQuestion
        payload={payload}
        answers={currentAnswers}
        onChange={(gapId, value) => setCurrentAnswers((prev) => ({ ...prev, [gapId]: value }))}
        checkResult={checkResult}
        instructions={instructions}
      />

      {!checkResult && (
        <Button onClick={handleCheck} disabled={!allGapsFilled}>
          Check
        </Button>
      )}

      {checkResult && (
        <div className="flex flex-col gap-3">
          <div
            className={`rounded-lg p-4 ${
              checkResult.score === checkResult.maxScore
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {checkResult.score === checkResult.maxScore
              ? "Correct!"
              : `${checkResult.score} / ${checkResult.maxScore} correct.`}
            {checkResult.explanation && (
              <p className="mt-2 text-sm text-gray-700">{checkResult.explanation}</p>
            )}
          </div>
          <Button onClick={handleNext}>
            {index + 1 < taskIds.length ? "Next →" : "Finish"}
          </Button>
        </div>
      )}
    </div>
  );
}
