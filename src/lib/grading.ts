import type {
  ClozeWordBankPayload,
  FillInBlankPayload,
  ParagraphMatchPayload,
  SentenceMcqPayload,
  TaskType,
  TextMcqPayload,
} from "./taskSchemas";

export type GapResult = { gapId: string; correct: boolean };
export type GradingResult = {
  score: number;
  maxScore: number;
  perGapResults: GapResult[];
};

function gradeSentenceMcq(
  payload: SentenceMcqPayload,
  answers: { answers?: Record<string, number> }
): GradingResult {
  const selectedIndex = answers.answers?.["1"];
  const correct = selectedIndex === payload.correctIndex;
  return {
    score: correct ? 1 : 0,
    maxScore: 1,
    perGapResults: [{ gapId: "1", correct }],
  };
}

function gradeTextMcq(
  payload: TextMcqPayload,
  answers: { answers?: Record<string, number> }
): GradingResult {
  const submitted = answers.answers ?? {};
  const perGapResults = payload.gaps.map((gap) => ({
    gapId: gap.id,
    correct: submitted[gap.id] === gap.correctIndex,
  }));
  const score = perGapResults.filter((r) => r.correct).length;
  return { score, maxScore: payload.gaps.length, perGapResults };
}

function gradeClozeWordBank(
  payload: ClozeWordBankPayload,
  answers: { answers?: Record<string, string> }
): GradingResult {
  const submitted = answers.answers ?? {};
  const perGapResults = payload.gaps.map((gap) => {
    const given = (submitted[gap.id] ?? "").trim().toLowerCase();
    const correctAnswer = gap.correctAnswer.trim().toLowerCase();
    return { gapId: gap.id, correct: given === correctAnswer };
  });
  const score = perGapResults.filter((r) => r.correct).length;
  return { score, maxScore: payload.gaps.length, perGapResults };
}

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

function gradeParagraphMatch(
  payload: ParagraphMatchPayload,
  answers: { answers?: Record<string, string> }
): GradingResult {
  const submitted = answers.answers ?? {};
  const perGapResults = payload.gaps.map((gap) => ({
    gapId: gap.id,
    correct: submitted[gap.id] === gap.correctParagraphId,
  }));
  const score = perGapResults.filter((r) => r.correct).length;
  return { score, maxScore: payload.gaps.length, perGapResults };
}

/** Human-readable correct answer for each gap, in gap order — used for self-check corrections. */
export function describeCorrectAnswers(type: TaskType, payload: unknown): string[] {
  switch (type) {
    case "SENTENCE_MCQ": {
      const p = payload as SentenceMcqPayload;
      return [p.options[p.correctIndex]];
    }
    case "TEXT_MCQ": {
      const p = payload as TextMcqPayload;
      return p.gaps.map((g) => g.options[g.correctIndex]);
    }
    case "CLOZE_WORD_BANK": {
      const p = payload as ClozeWordBankPayload;
      return p.gaps.map((g) => g.correctAnswer);
    }
    case "PARAGRAPH_MATCH": {
      const p = payload as ParagraphMatchPayload;
      const byId = new Map(p.paragraphs.map((par) => [par.id, par.text]));
      return p.gaps.map((g) => byId.get(g.correctParagraphId) ?? "");
    }
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
    case "SENTENCE_MCQ": {
      const p = payload as SentenceMcqPayload;
      const given = (answers as { answers?: Record<string, number> })?.answers?.["1"];
      return [given !== undefined ? p.options[given] ?? NOT_ANSWERED : NOT_ANSWERED];
    }
    case "TEXT_MCQ": {
      const p = payload as TextMcqPayload;
      const submitted = (answers as { answers?: Record<string, number> })?.answers ?? {};
      return p.gaps.map((g) => {
        const given = submitted[g.id];
        return given !== undefined ? g.options[given] ?? NOT_ANSWERED : NOT_ANSWERED;
      });
    }
    case "CLOZE_WORD_BANK": {
      const p = payload as ClozeWordBankPayload;
      const submitted = (answers as { answers?: Record<string, string> })?.answers ?? {};
      return p.gaps.map((g) => submitted[g.id] || NOT_ANSWERED);
    }
    case "PARAGRAPH_MATCH": {
      const p = payload as ParagraphMatchPayload;
      const submitted = (answers as { answers?: Record<string, string> })?.answers ?? {};
      const byId = new Map(p.paragraphs.map((par) => [par.id, par.text]));
      return p.gaps.map((g) => (submitted[g.id] ? byId.get(submitted[g.id]) ?? NOT_ANSWERED : NOT_ANSWERED));
    }
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
    case "SENTENCE_MCQ":
      return gradeSentenceMcq(
        payload as SentenceMcqPayload,
        answers as { answers?: Record<string, number> }
      );
    case "TEXT_MCQ":
      return gradeTextMcq(
        payload as TextMcqPayload,
        answers as { answers?: Record<string, number> }
      );
    case "CLOZE_WORD_BANK":
      return gradeClozeWordBank(
        payload as ClozeWordBankPayload,
        answers as { answers?: Record<string, string> }
      );
    case "PARAGRAPH_MATCH":
      return gradeParagraphMatch(
        payload as ParagraphMatchPayload,
        answers as { answers?: Record<string, string> }
      );
    case "FILL_IN_SENTENCE":
    case "FILL_IN_TEXT":
      return gradeFillInBlank(
        payload as FillInBlankPayload,
        answers as { answers?: Record<string, string> }
      );
  }
}
