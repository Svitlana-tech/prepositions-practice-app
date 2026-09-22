"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { taskTypeLabel } from "@/lib/taskTypes";
import { clozeToPayload, countBlanks, type EditableCloze } from "@/lib/clozeEditing";
import { ClozeQuestion, type CurrentAnswers } from "@/components/student/QuestionRenderers";
import type { ClozeDisplayMode } from "@/lib/taskSchemas";

/** This form only ever produces questions of one type, and only offers that type's topics. */
const TASK_TYPE = "CLOZE_WORD_BANK";

type Initial = {
  taskId?: string;
  title: string;
  instructions: string;
  cloze: EditableCloze;
  isPublished: boolean;
  categoryId?: string | null;
  explanation?: string;
};

type Category = { id: string; name: string };

const defaultValues: Initial = {
  title: "",
  instructions: "Fill in each gap with a word from the box below.",
  cloze: { text: "", blanks: [], wordBank: [], displayMode: "dropdown" },
  isPublished: true,
  categoryId: null,
  explanation: "",
};

function parseWordBank(raw: string): string[] {
  return raw
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
}

export function ClozeWordBankForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const categoryIdParam = searchParams.get("categoryId");
  const isEditing = Boolean(initial?.taskId);
  const [values, setValues] = useState<Initial>(
    initial ?? { ...defaultValues, categoryId: categoryIdParam || null }
  );
  const [wordBankInput, setWordBankInput] = useState(values.cloze.wordBank.join(", "));
  const [previewAnswers, setPreviewAnswers] = useState<CurrentAnswers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/teacher/categories?taskType=${TASK_TYPE}`)
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []));
  }, []);

  // Keep one blank slot per "___" in the text, without losing what's already typed.
  useEffect(() => {
    const count = countBlanks(values.cloze.text);
    setValues((v) => {
      if (v.cloze.blanks.length === count) return v;
      const next = [...v.cloze.blanks];
      while (next.length < count) next.push("");
      next.length = count;
      return { ...v, cloze: { ...v.cloze, blanks: next } };
    });
  }, [values.cloze.text]);

  // Whatever the teacher was trying out in the preview stops making sense once the
  // underlying question changes, so start it over.
  useEffect(() => {
    setPreviewAnswers({});
  }, [values.cloze.text, wordBankInput, values.cloze.displayMode]);

  function setDisplayMode(mode: ClozeDisplayMode) {
    setValues({ ...values, cloze: { ...values.cloze, displayMode: mode } });
  }

  function updateBlank(idx: number, value: string) {
    const next = [...values.cloze.blanks];
    next[idx] = value;
    setValues({ ...values, cloze: { ...values.cloze, blanks: next } });
  }

  function fillWordBankFromBlanks() {
    const unique = [...new Set(values.cloze.blanks.map((b) => b.trim()).filter(Boolean))];
    setWordBankInput(unique.join(", "));
  }

  function validate(): string | null {
    const blankCount = countBlanks(values.cloze.text);
    if (blankCount === 0) {
      return 'Add at least one gap by typing "___" in the text.';
    }
    if (values.cloze.blanks.some((b) => !b.trim())) {
      return "Fill in the correct word for every gap.";
    }
    const wordBank = parseWordBank(wordBankInput);
    if (wordBank.length === 0) {
      return "Add the words students can choose from to the word bank.";
    }
    const missing = values.cloze.blanks
      .map((b) => b.trim())
      .filter((b) => !wordBank.includes(b));
    if (missing.length > 0) {
      return `Add these exact words to the word bank: ${[...new Set(missing)].join(", ")}`;
    }
    return null;
  }

  async function handleSubmit(andAddAnother: boolean) {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    setWarnings([]);
    const payload = clozeToPayload({ ...values.cloze, wordBank: parseWordBank(wordBankInput) });
    const body = {
      type: TASK_TYPE,
      title: values.title.trim() || payload.text.replace(/\{[^}]+\}/g, "___"),
      instructions: values.instructions,
      isPublished: values.isPublished,
      categoryId: values.categoryId || null,
      explanation: values.explanation || "",
      payload,
    };
    const url = values.taskId ? `/api/teacher/tasks/${values.taskId}` : "/api/teacher/tasks";
    const method = values.taskId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not save the task.");
      return;
    }
    setWarnings(data.warnings ?? []);
    if (andAddAnother) {
      setAddedCount((n) => n + 1);
      setValues({
        ...values,
        title: "",
        cloze: { text: "", blanks: [], wordBank: [], displayMode: values.cloze.displayMode },
        explanation: "",
      });
      setWordBankInput("");
      textRef.current?.focus();
    } else {
      router.push(returnTo || "/teacher");
    }
  }

  const blankCount = countBlanks(values.cloze.text);
  const previewPayload = clozeToPayload({
    text: values.cloze.text,
    blanks: values.cloze.blanks,
    wordBank: parseWordBank(wordBankInput),
    displayMode: values.cloze.displayMode,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        {returnTo && (
          <Link href={returnTo} className="text-sm text-blue-600 hover:underline">
            ← Back without saving
          </Link>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Topic <span className="font-normal text-gray-500">— {taskTypeLabel(TASK_TYPE)}</span>
          </label>
          <select
            value={values.categoryId ?? ""}
            onChange={(e) => setValues({ ...values, categoryId: e.target.value || null })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          >
            <option value="">No topic</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Only topics of this question type are listed.{" "}
            <Link href="/teacher/categories" className="text-blue-600 hover:underline">
              Manage topics
            </Link>
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Text (put <code>___</code> where each gap should be)
          </label>
          <Textarea
            ref={textRef}
            rows={5}
            placeholder="Yesterday I ___ to the shop and ___ some bread."
            value={values.cloze.text}
            onChange={(e) =>
              setValues({ ...values, cloze: { ...values.cloze, text: e.target.value } })
            }
          />
        </div>

        {blankCount > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Correct word for each gap
            </label>
            <div className="flex flex-col gap-2">
              {values.cloze.blanks.map((blank, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-sm text-gray-500">Gap {idx + 1}</span>
                  <Input value={blank} onChange={(e) => updateBlank(idx, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Word bank (comma-separated; add extra words as distractors)
            </label>
            <button
              type="button"
              onClick={fillWordBankFromBlanks}
              className="text-xs text-blue-600 hover:underline"
            >
              Fill from correct words
            </button>
          </div>
          <Textarea
            rows={2}
            className="font-sans"
            placeholder="went, bought, ate, saw"
            value={wordBankInput}
            onChange={(e) => setWordBankInput(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            How students fill the gaps
          </label>
          <div className="flex flex-col gap-2">
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                values.cloze.displayMode === "dropdown"
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                className="mt-1"
                checked={values.cloze.displayMode === "dropdown"}
                onChange={() => setDisplayMode("dropdown")}
              />
              <span>
                <span className="font-medium text-gray-900">Dropdown list</span>
                <span className="block text-gray-500">
                  Each gap gets its own dropdown with all the words. Best for a short word list.
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                values.cloze.displayMode === "wordBank"
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                className="mt-1"
                checked={values.cloze.displayMode === "wordBank"}
                onChange={() => setDisplayMode("wordBank")}
              />
              <span>
                <span className="font-medium text-gray-900">Word bank (tap or drag)</span>
                <span className="block text-gray-500">
                  Words sit as buttons below the text; used ones disappear from the list. Better
                  when there are many words.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Explanation (optional) — why these are the correct words
          </label>
          <Textarea
            rows={2}
            className="font-sans"
            value={values.explanation ?? ""}
            onChange={(e) => setValues({ ...values, explanation: e.target.value })}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={values.isPublished}
            onChange={(e) => setValues({ ...values, isPublished: e.target.checked })}
          />
          Published (visible to students)
        </label>

        <details className="rounded-lg border border-gray-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-500">
            Advanced (optional)
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
              <Input
                value={values.title}
                placeholder="Defaults to the text itself — students never see this"
                onChange={(e) => setValues({ ...values, title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Instructions</label>
              <Input
                value={values.instructions}
                onChange={(e) => setValues({ ...values, instructions: e.target.value })}
              />
            </div>
          </div>
        </details>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="mb-1 font-medium">Saved, but worth a look:</p>
            <ul className="list-disc pl-5">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {isEditing ? (
          <Button onClick={() => handleSubmit(false)} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => handleSubmit(true)} disabled={saving}>
              {saving ? "Saving..." : "Save and add next"}
            </Button>
            <Button variant="secondary" onClick={() => handleSubmit(false)} disabled={saving}>
              Save and finish
            </Button>
            {addedCount > 0 && (
              <span className="text-sm text-green-700">
                ✓ Added {addedCount} text{addedCount === 1 ? "" : "s"} this session
              </span>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-gray-500">
          What the student will see — try it out below:
        </div>
        <Card>
          {blankCount > 0 && previewPayload.wordBank.length > 0 ? (
            <ClozeQuestion
              payload={previewPayload}
              answers={previewAnswers}
              onChange={(gapId, value) =>
                setPreviewAnswers((prev) => ({ ...prev, [gapId]: value }))
              }
              checkResult={null}
              fixedTray={false}
            />
          ) : (
            <p className="text-sm text-gray-400">
              Add a gap (<code>___</code>) and at least one word in the word bank to see a
              preview.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
