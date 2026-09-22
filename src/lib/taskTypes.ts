import type { TaskType } from "./taskSchemas";

/**
 * One entry per question type. The teacher picks a type first; topics, questions
 * and practice sessions all live inside a single type.
 */
export type TaskTypeInfo = {
  type: TaskType;
  /** Short name used in headings, dropdowns and cards. */
  label: string;
  description: string;
  /** Teacher form for adding a question of this type. */
  newHref: string;
  /** false = type is designed but the form/player isn't built yet. */
  available: boolean;
};

export const TASK_TYPES: TaskTypeInfo[] = [
  {
    type: "SENTENCE_MCQ",
    label: "Missing word in a sentence",
    description: "One sentence, one gap, 4 answer options.",
    newHref: "/teacher/tasks/new/sentence-mcq",
    available: true,
  },
  {
    type: "TEXT_MCQ",
    label: "Missing words in a text",
    description: "A short text with several gaps, each with 4 answer options (dropdown).",
    newHref: "/teacher/tasks/new/text-mcq",
    available: true,
  },
  {
    type: "CLOZE_WORD_BANK",
    label: "Gap fill (word bank)",
    description: "A text with gaps; the words/phrases to insert are listed below it.",
    newHref: "/teacher/tasks/new/cloze",
    available: true,
  },
  {
    type: "FILL_IN_SENTENCE",
    label: "Type the missing word (sentence)",
    description: "One sentence with one or more gaps and no options — the student types the answer.",
    newHref: "/teacher/tasks/new/fill-in-sentence",
    available: true,
  },
  {
    type: "FILL_IN_TEXT",
    label: "Type the missing words (text)",
    description: "A longer text with several gaps and no options — the student types each answer.",
    newHref: "/teacher/tasks/new/fill-in-text",
    available: true,
  },
  {
    type: "PARAGRAPH_MATCH",
    label: "Paragraph matching",
    description: "A text with paragraphs removed, plus a paragraph list with one extra.",
    newHref: "/teacher/tasks/new/paragraph-match",
    available: false,
  },
];

export const AVAILABLE_TASK_TYPES = TASK_TYPES.filter((t) => t.available);

export function isTaskType(value: unknown): value is TaskType {
  return typeof value === "string" && TASK_TYPES.some((t) => t.type === value);
}

export function taskTypeInfo(type: string): TaskTypeInfo | undefined {
  return TASK_TYPES.find((t) => t.type === type);
}

export function taskTypeLabel(type: string): string {
  return taskTypeInfo(type)?.label ?? type;
}
