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
