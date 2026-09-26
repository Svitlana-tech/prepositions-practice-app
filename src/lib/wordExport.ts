import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { prisma } from "@/lib/db";
import { ACADEMIC_TOPIC_NAME } from "@/lib/topics";

/** Topics come out in the same order the student menu reads them; any others follow alphabetically. */
const TOPIC_ORDER = ["Essential", "Dependent", "Fixed Expressions", "Phrasal Verbs", ACADEMIC_TOPIC_NAME];
const NO_TOPIC = "No topic";

/** Same look the teacher uses to mark the answer in the .docx files she sends in. */
const ANSWER_COLOR = "EE0000";
const NOTE_COLOR = "666666";

type ExportTask = {
  isPublished: boolean;
  payload: unknown;
  explanation: string | null;
  explanationEntry: { label: string; text: string } | null;
  category: { name: string } | null;
};

type Payload = {
  text?: unknown;
  sentence?: unknown;
  gaps?: { id: string; correctAnswer: string }[];
  options?: unknown;
};

function topicRank(name: string): number {
  const index = TOPIC_ORDER.indexOf(name);
  if (index !== -1) return index;
  return name === NO_TOPIC ? TOPIC_ORDER.length + 1 : TOPIC_ORDER.length;
}

/** The sentence with every gap filled in by its answer, the answer in red bold. */
function sentenceRuns(payload: Payload): TextRun[] {
  const text = String(payload.text ?? payload.sentence ?? "");
  const answers = new Map((payload.gaps ?? []).map((g) => [g.id, g.correctAnswer]));
  return text.split(/\{(\w+)\}/).map((part, i) => {
    if (i % 2 === 0) return new TextRun(part);
    let answer = answers.get(part) ?? "___";
    if (i === 1 && !text.slice(0, text.indexOf("{")).trim()) answer = answer.charAt(0).toUpperCase() + answer.slice(1);
    return new TextRun({ text: answer, bold: true, color: ANSWER_COLOR, size: 28 });
  });
}

function wrongOptions(payload: Payload): string[] {
  const correct = new Set((payload.gaps ?? []).map((g) => g.correctAnswer));
  const options = Array.isArray(payload.options) ? payload.options.map(String) : [];
  return options.filter((o) => !correct.has(o));
}

function taskParagraphs(task: ExportTask, number: number): Paragraph[] {
  const payload = (task.payload ?? {}) as Payload;
  const wrong = wrongOptions(payload);
  const paragraphs = [
    new Paragraph({
      spacing: { before: 160 },
      children: [
        new TextRun(`${number}. `),
        ...sentenceRuns(payload),
        ...(wrong.length ? [new TextRun({ text: `  (${wrong.join(", ")})`, color: NOTE_COLOR })] : []),
        ...(task.isPublished ? [] : [new TextRun({ text: "  [draft]", italics: true, color: NOTE_COLOR })]),
      ],
    }),
  ];
  const note = task.explanationEntry ? `Rule: ${task.explanationEntry.label}` : task.explanation;
  if (note) {
    paragraphs.push(
      new Paragraph({
        indent: { left: 360 },
        children: [new TextRun({ text: note, italics: true, color: NOTE_COLOR, size: 20 })],
      })
    );
  }
  return paragraphs;
}

/**
 * Every sentence in the task bank as a Word document, grouped by topic (each topic on its
 * own page). Pass a topic id to get just that topic. Rules linked from the exported
 * sentences are written out once, at the end, instead of under every sentence.
 */
export async function buildTasksDocx(categoryId?: string): Promise<{ buffer: Buffer; fileName: string }> {
  const tasks: ExportTask[] = await prisma.task.findMany({
    where: { inBank: true, ...(categoryId ? { categoryId } : {}) },
    select: {
      isPublished: true,
      payload: true,
      explanation: true,
      explanationEntry: { select: { label: true, text: true } },
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const byTopic = new Map<string, ExportTask[]>();
  for (const task of tasks) {
    const name = task.category?.name ?? NO_TOPIC;
    if (!byTopic.has(name)) byTopic.set(name, []);
    byTopic.get(name)!.push(task);
  }
  const topics = [...byTopic.entries()].sort(
    ([a], [b]) => topicRank(a) - topicRank(b) || a.localeCompare(b)
  );

  const date = new Date().toISOString().slice(0, 10);
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Prepositions")] }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${tasks.length} sentences · ${date} · the right answer is in red, the other card options are in brackets`,
          color: NOTE_COLOR,
        }),
      ],
    }),
  ];

  topics.forEach(([name, topicTasks], topicIndex) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: topicIndex > 0,
        children: [new TextRun(`${name} (${topicTasks.length})`)],
      })
    );
    topicTasks.forEach((task, i) => children.push(...taskParagraphs(task, i + 1)));
  });

  const rules = new Map<string, string>();
  for (const task of tasks) {
    if (task.explanationEntry) rules.set(task.explanationEntry.label, task.explanationEntry.text);
  }
  if (rules.size > 0) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("Rules")] })
    );
    for (const [label, text] of [...rules.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(label)] }));
      for (const line of text.split("\n").filter((l) => l.trim())) {
        children.push(new Paragraph({ children: [new TextRun(line.trim())] }));
      }
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 24 } } } },
    sections: [{ children }],
  });
  const buffer = await Packer.toBuffer(doc);

  const topicPart = categoryId && topics.length === 1 ? `-${topics[0][0].toLowerCase().replace(/\s+/g, "-")}` : "";
  return { buffer, fileName: `prepositions${topicPart}-${date}.docx` };
}
