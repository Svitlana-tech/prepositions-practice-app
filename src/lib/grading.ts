import type { FillInBlankPayload, TaskType } from "./taskSchemas";

export type GapResult = { gapId: string; correct: boolean };
export type GradingResult = {
  score: number;
  maxScore: number;
  perGapResults: GapResult[];
};

/** Case-sensitive exact match (only leading/trailing whitespace is trimmed away). */
function gradeFillInBlank(
  payload: FillInBlankPayload,
  answers: { answers?: Record<string, string> }
): GradingResult {
  const submitted = answers.answers ?? {};
  const perGapResults = payload.gaps.map((gap) => {
    const given = (submitted[gap.id] ?? "").trim();
    return { gapId: gap.id, correct: given === gap.correctAnswer.trim() };
  });
  const score = perGapResults.filter((r) => r.correct).length;
  return { score, maxScore: payload.gaps.length, perGapResults };
}

/** Human-readable correct answer for each gap, in gap order — used for self-check corrections. */
export function describeCorrectAnswers(type: TaskType, payload: unknown): string[] {
  switch (type) {
    case "FILL_IN_SENTENCE":
    case "FILL_IN_TEXT": {
      const p = payload as FillInBlankPayload;
      return p.gaps.map((g) => g.correctAnswer);
    }
  }
}

/** Human-readable version of what the student actually submitted, in gap order — for the teacher's detail table. */
export function describeGivenAnswers(type: TaskType, payload: unknown, answers: unknown): string[] {
  const NOT_ANSWERED = "(no answer)";
  switch (type) {
    case "FILL_IN_SENTENCE":
    case "FILL_IN_TEXT": {
      const p = payload as FillInBlankPayload;
      const submitted = (answers as { answers?: Record<string, string> })?.answers ?? {};
      return p.gaps.map((g) => submitted[g.id] || NOT_ANSWERED);
    }
  }
}

export function gradeAttempt(
  type: TaskType,
  payload: unknown,
  answers: unknown
): GradingResult {
  switch (type) {
    case "FILL_IN_SENTENCE":
    case "FILL_IN_TEXT":
      return gradeFillInBlank(
        payload as FillInBlankPayload,
        answers as { answers?: Record<string, string> }
      );
  }
}
