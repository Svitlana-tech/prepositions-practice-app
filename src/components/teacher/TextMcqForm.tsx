"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { taskTypeLabel } from "@/lib/taskTypes";
import { textMcqToPayload, countGaps, type EditableTextMcq } from "@/lib/textMcqEditing";
import { TextMcqQuestion, type CurrentAnswers } from "@/components/student/QuestionRenderers";

/** This form only ever produces questions of one type, and only offers that type's topics. */
const TASK_TYPE = "TEXT_MCQ";

type Initial = {
  taskId?: string;
  title: string;
  instructions: string;
  textMcq: EditableTextMcq;
  isPublished: boolean;
  categoryId?: string | null;
  explanation?: string;
};

type Category = { id: string; name: string };

const defaultValues: Initial = {
  title: "",
  instructions: "Choose the correct word for each gap.",
  textMcq: { text: "", gaps: [] },
  isPublished: true,
  categoryId: null,
  explanation: "",
};

export function TextMcqForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const categoryIdParam = searchParams.get("categoryId");
  const isEditing = Boolean(initial?.taskId);
  const [values, setValues] = useState<Initial>(
    initial ?? { ...defaultValues, categoryId: categoryIdParam || null }
  );
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

  // Keep one gap slot per "___" in the text, without losing what's already typed.
  useEffect(() => {
    const count = countGaps(values.textMcq.text);
    setValues((v) => {
      if (v.textMcq.gaps.length === count) return v;
      const next = [...v.textMcq.gaps];
      while (next.length < count) next.push({ options: ["", "", "", ""], correctIndex: null });
      next.length = count;
      return { ...v, textMcq: { ...v.textMcq, gaps: next } };
    });
  }, [values.textMcq.text]);

  useEffect(() => {
    setPreviewAnswers({});
  }, [values.textMcq]);

  function updateGapOption(gapIdx: number, optIdx: number, text: string) {
    const next = [...values.textMcq.gaps];
    const options = [...next[gapIdx].options];
    options[optIdx] = text;
    next[gapIdx] = { ...next[gapIdx], options };
    setValues({ ...values, textMcq: { ...values.textMcq, gaps: next } });
  }

  function updateGapCorrect(gapIdx: number, correctIndex: number) {
    const next = [...values.textMcq.gaps];
    next[gapIdx] = { ...next[gapIdx], correctIndex };
    setValues({ ...values, textMcq: { ...values.textMcq, gaps: next } });
  }

  function validate(): string | null {
    const gapCount = countGaps(values.textMcq.text);
    if (gapCount === 0) {
      return 'Add at least one gap by typing "___" in the text.';
    }
    for (let i = 0; i < values.textMcq.gaps.length; i++) {
      const gap = values.textMcq.gaps[i];
      if (gap.options.some((o) => !o.trim())) {
        return `Fill in all 4 options for gap ${i + 1}.`;
      }
      if (gap.correctIndex === null) {
        return `Mark the correct option for gap ${i + 1}.`;
      }
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
    const payload = textMcqToPayload(values.textMcq);
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
        textMcq: { text: "", gaps: [] },
        explanation: "",
      });
      textRef.current?.focus();
    } else {
      router.push(returnTo || "/teacher");
    }
  }

  const gapCount = countGaps(values.textMcq.text);
  const previewPayload = textMcqToPayload(values.textMcq);
  const previewReady = gapCount > 0 && values.textMcq.gaps.every((g) => g.options.every((o) => o.trim()));

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
            Text (put <code>___</code> where each gap should be — as many as you like)
          </label>
          <Textarea
            ref={textRef}
            rows={5}
            placeholder="Yesterday I ___ to the shop and ___ some bread."
            value={values.textMcq.text}
            onChange={(e) =>
              setValues({ ...values, textMcq: { ...values.textMcq, text: e.target.value } })
            }
          />
        </div>

        {gapCount > 0 && (
          <div className="flex flex-col gap-4">
            {values.textMcq.gaps.map((gap, gapIdx) => (
              <div key={gapIdx} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 text-sm font-medium text-gray-700">
                  Gap {gapIdx + 1} — 4 options (mark the correct one)
                </div>
                <div className="flex flex-col gap-2">
                  {gap.options.map((option, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`gap-${gapIdx}-correct`}
                        checked={gap.correctIndex === optIdx}
                        onChange={() => updateGapCorrect(gapIdx, optIdx)}
                      />
                      <Input
                        value={option}
                        onChange={(e) => updateGapOption(gapIdx, optIdx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
          {previewReady ? (
            <TextMcqQuestion
              payload={previewPayload}
              answers={previewAnswers}
              onChange={(gapId, value) =>
                setPreviewAnswers((prev) => ({ ...prev, [gapId]: value }))
              }
              checkResult={null}
            />
          ) : (
            <p className="text-sm text-gray-400">
              Add a gap (<code>___</code>) and fill in its 4 options to see a preview.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
