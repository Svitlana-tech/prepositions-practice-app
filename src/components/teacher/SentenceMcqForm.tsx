"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { taskTypeLabel } from "@/lib/taskTypes";

/** This form only ever produces questions of one type, and only offers that type's topics. */
const TASK_TYPE = "SENTENCE_MCQ";

type Initial = {
  taskId?: string;
  title: string;
  instructions: string;
  sentence: string;
  options: string[];
  correctIndex: number | null;
  isPublished: boolean;
  categoryId?: string | null;
  explanation?: string;
};

type Category = { id: string; name: string };

const defaultValues: Initial = {
  title: "",
  instructions: "Choose the correct option to fill the gap.",
  sentence: "",
  options: ["", "", "", ""],
  correctIndex: null,
  isPublished: true,
  categoryId: null,
  explanation: "",
};

export function SentenceMcqForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const categoryIdParam = searchParams.get("categoryId");
  const isEditing = Boolean(initial?.taskId);
  const [values, setValues] = useState<Initial>(
    initial ?? { ...defaultValues, categoryId: categoryIdParam || null }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const sentenceRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/teacher/categories?taskType=${TASK_TYPE}`)
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []));
  }, []);

  const gapIndex = values.sentence.indexOf("___");
  const before = gapIndex >= 0 ? values.sentence.slice(0, gapIndex) : values.sentence;
  const after = gapIndex >= 0 ? values.sentence.slice(gapIndex + 3) : "";

  function updateOption(idx: number, text: string) {
    const next = [...values.options];
    next[idx] = text;
    setValues({ ...values, options: next });
  }

  async function handleSubmit(andAddAnother: boolean) {
    if (values.correctIndex === null) {
      setError("Mark which option is the correct answer.");
      return;
    }
    setSaving(true);
    setError(null);
    setWarnings([]);
    const body = {
      type: TASK_TYPE,
      title: values.title.trim() || values.sentence.trim(),
      instructions: values.instructions,
      isPublished: values.isPublished,
      categoryId: values.categoryId || null,
      explanation: values.explanation || "",
      payload: {
        sentence: values.sentence,
        options: values.options,
        correctIndex: values.correctIndex,
      },
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
        sentence: "",
        options: ["", "", "", ""],
        correctIndex: null,
        explanation: "",
      });
      sentenceRef.current?.focus();
    } else {
      router.push(returnTo || "/teacher");
    }
  }

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
            Sentence (put <code>___</code> where the gap should be)
          </label>
          <Textarea
            ref={sentenceRef}
            rows={2}
            placeholder="She ___ to school every day."
            value={values.sentence}
            onChange={(e) => setValues({ ...values, sentence: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            4 answer options (mark the correct one)
          </label>
          <div className="flex flex-col gap-2">
            {values.options.map((option, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctIndex"
                  checked={values.correctIndex === idx}
                  onChange={() => setValues({ ...values, correctIndex: idx })}
                />
                <Input
                  value={option}
                  placeholder={["go", "goes", "going", "gone"][idx]}
                  onChange={(e) => updateOption(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Explanation (optional) — why this is the correct answer
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
                placeholder="Defaults to the sentence itself — students never see this"
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
                ✓ Added {addedCount} sentence{addedCount === 1 ? "" : "s"} this session
              </span>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-gray-500">What the student will see:</div>
        <Card>
          <p className="mb-4 text-gray-900">
            {before}
            <span className="mx-1 inline-block min-w-[3rem] border-b-2 border-gray-400">&nbsp;</span>
            {after}
          </p>
          <div className="flex flex-col gap-2">
            {values.options.map((option, idx) => (
              <div
                key={idx}
                className={`rounded-lg border px-4 py-2 ${
                  idx === values.correctIndex ? "border-green-400 bg-green-50" : "border-gray-200"
                }`}
              >
                {option || <span className="text-gray-400">(empty)</span>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
