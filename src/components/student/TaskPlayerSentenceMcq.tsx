"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Payload = { sentence: string; options: string[] };
type SubmitResult = { score: number; maxScore: number; perGapResults: { gapId: string; correct: boolean }[] };

export function TaskPlayerSentenceMcq({
  payload,
  onSubmit,
}: {
  payload: Payload;
  onSubmit: (answers: { answers: Record<string, number> }) => Promise<SubmitResult>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [before, after] = payload.sentence.split("___");

  async function handleSubmit() {
    if (selected === null) return;
    setSubmitting(true);
    try {
      const res = await onSubmit({ answers: { "1": selected } });
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }

  const isCorrect = result?.perGapResults[0]?.correct;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-gray-900">
        {before}
        <span className="mx-1 inline-block min-w-[3rem] border-b-2 border-gray-400 text-center font-medium text-blue-700">
          {selected !== null ? payload.options[selected] : "     "}
        </span>
        {after}
      </p>

      <div className="flex flex-col gap-2">
        {payload.options.map((option, idx) => {
          const isSelected = selected === idx;
          let stateClasses = "border-gray-300 hover:border-blue-400";
          if (result) {
            if (idx === selected) {
              stateClasses = isCorrect
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50";
            }
          } else if (isSelected) {
            stateClasses = "border-blue-500 bg-blue-50";
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={!!result}
              onClick={() => setSelected(idx)}
              className={`rounded-lg border px-4 py-2 text-left transition-colors disabled:cursor-default ${stateClasses}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {!result && (
        <Button onClick={handleSubmit} disabled={selected === null || submitting}>
          {submitting ? "Checking..." : "Check"}
        </Button>
      )}

      {result && (
        <div
          className={`rounded-lg p-4 ${
            isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {isCorrect ? "Correct!" : "Not quite."} Result: {result.score} / {result.maxScore}
        </div>
      )}
    </div>
  );
}
