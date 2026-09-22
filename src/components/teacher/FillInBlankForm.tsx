"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { taskTypeLabel } from "@/lib/taskTypes";
import { fillInToPayload, countBlanks, type EditableFillIn } from "@/lib/fillInEditing";
import { FillInBlankQuestion, type CurrentAnswers } from "@/components/student/QuestionRenderers";
import { PREPOSITIONS } from "@/lib/prepositions";
import { shuffle } from "@/lib/shuffle";
import type { FillInDisplayMode } from "@/lib/taskSchemas";

const DEFAULT_INSTRUCTIONS =
  'Type the missing word or phrase exactly as it should appear. Write full forms — no ' +
  'contractions (e.g. "do not", not "don\'t") when the answer is more than one word. ' +
  "Capital and lowercase letters matter, so match the case the sentence needs.";

const CARDS_INSTRUCTIONS =
  "Tap a preposition card, then press Confirm. You can try again if you're wrong.";

const DEFAULT_OPTIONS_COUNT = 9;

function defaultOptions(correctAnswer: string): string[] {
  const rest = (PREPOSITIONS as readonly string[]).filter((w) => w !== correctAnswer);
  return shuffle([correctAnswer, ...shuffle(rest).slice(0, DEFAULT_OPTIONS_COUNT - 1)]);
}

type Initial = {
  taskId?: string;
  title: string;
  instructions: string;
  fillIn: EditableFillIn;
  isPublished: boolean;
  categoryId?: string | null;
  explanation?: string;
  explanationEntryId?: string | null;
};

type Category = { id: string; name: string };
type ExplanationEntry = { id: string; label: string; text: string };

function defaultValues(): Initial {
  return {
    title: "",
    instructions: DEFAULT_INSTRUCTIONS,
    fillIn: { text: "", blanks: [], displayMode: "type" },
    isPublished: true,
    categoryId: null,
    explanation: "",
    explanationEntryId: null,
  };
}

/**
 * Shared by both FILL_IN_SENTENCE and FILL_IN_TEXT — the payload shape, grading and UI are
 * identical; only the task type (and so the topic scoping and default copy) differ.
 */
export function FillInBlankForm({
  taskType,
  initial,
}: {
  taskType: "FILL_IN_SENTENCE" | "FILL_IN_TEXT";
  initial?: Initial;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const categoryIdParam = searchParams.get("categoryId");
  const isEditing = Boolean(initial?.taskId);
  const isSentence = taskType === "FILL_IN_SENTENCE";
  const [values, setValues] = useState<Initial>(
    initial ?? { ...defaultValues(), categoryId: categoryIdParam || null }
  );
  const [previewAnswers, setPreviewAnswers] = useState<CurrentAnswers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [bankEntries, setBankEntries] = useState<ExplanationEntry[]>([]);
  const [useBank, setUseBank] = useState(Boolean(initial?.explanationEntryId));
  const [newRuleLabel, setNewRuleLabel] = useState("");
  const [newRuleText, setNewRuleText] = useState("");

  useEffect(() => {
    fetch(`/api/teacher/categories?taskType=${taskType}`)
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []));
  }, [taskType]);

  useEffect(() => {
    fetch("/api/teacher/explanations")
      .then((res) => res.json())
      .then((data) => setBankEntries(data.entries ?? []));
  }, []);

  // Keep one blank slot per "___" in the text, without losing what's already typed.
  useEffect(() => {
    const count = countBlanks(values.fillIn.text);
    setValues((v) => {
      if (v.fillIn.blanks.length === count) return v;
      const next = [...v.fillIn.blanks];
      while (next.length < count) next.push("");
      next.length = count;
      return { ...v, fillIn: { ...v.fillIn, blanks: next } };
    });
  }, [values.fillIn.text]);

  useEffect(() => {
    setPreviewAnswers({});
  }, [values.fillIn.text]);

  function setDisplayMode(mode: FillInDisplayMode) {
    setValues((v) => {
      const answer = v.fillIn.blanks[0]?.trim();
      const needsDefaultOptions =
        mode === "cards" && (!v.fillIn.options || v.fillIn.options.length === 0);
      return {
        ...v,
        fillIn: {
          ...v.fillIn,
          displayMode: mode,
          options: needsDefaultOptions
            ? defaultOptions(
                answer && (PREPOSITIONS as readonly string[]).includes(answer) ? answer : "in"
              )
            : v.fillIn.options,
        },
        // Swap the default copy for the mode, but never overwrite instructions the teacher
        // has actually customized.
        instructions:
          v.instructions === (mode === "cards" ? DEFAULT_INSTRUCTIONS : CARDS_INSTRUCTIONS)
            ? mode === "cards"
              ? CARDS_INSTRUCTIONS
              : DEFAULT_INSTRUCTIONS
            : v.instructions,
      };
    });
  }

  function updateBlank(idx: number, value: string) {
    const next = [...values.fillIn.blanks];
    next[idx] = value;
    setValues((v) => {
      let options = v.fillIn.options;
      const answer = value.trim();
      if (idx === 0 && v.fillIn.displayMode === "cards" && answer) {
        if (!options || options.length === 0) {
          // First answer typed for a fresh cards question — seed a default set.
          options = defaultOptions((PREPOSITIONS as readonly string[]).includes(answer) ? answer : "in");
        } else if (!options.includes(answer)) {
          // Keep the correct answer available as a card whenever it changes to a new word.
          options = [...options, answer];
        }
      }
      return { ...v, fillIn: { ...v.fillIn, blanks: next, options } };
    });
  }

  function toggleOption(word: string) {
    setValues((v) => {
      const options = v.fillIn.options ?? [];
      const next = options.includes(word) ? options.filter((o) => o !== word) : [...options, word];
      return { ...v, fillIn: { ...v.fillIn, options: next } };
    });
  }

  function validate(): string | null {
    const blankCount = countBlanks(values.fillIn.text);
    if (blankCount === 0) {
      return 'Add at least one gap by typing "___" in the text.';
    }
    if (values.fillIn.blanks.some((b) => !b.trim())) {
      return "Fill in the correct answer for every gap.";
    }
    if (values.fillIn.displayMode === "cards") {
      if (blankCount !== 1) {
        return "Cards mode only works for a sentence with a single gap.";
      }
      const answer = values.fillIn.blanks[0].trim();
      if (!(PREPOSITIONS as readonly string[]).includes(answer)) {
        return `Cards mode needs the answer to be one of the preposition options — "${answer}" isn't in that list.`;
      }
      const options = values.fillIn.options ?? [];
      if (options.length < 4 || options.length > 12) {
        return `Pick 4–12 cards to show (currently ${options.length}).`;
      }
      if (!options.includes(answer)) {
        return "The card list must include the correct answer.";
      }
      if (useBank && !values.explanationEntryId && (!newRuleLabel.trim() || !newRuleText.trim())) {
        return "Pick an existing rule from the bank, or fill in both a name and text for a new one.";
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

    let explanationEntryId: string | null = null;
    if (useBank && values.fillIn.displayMode === "cards") {
      if (values.explanationEntryId) {
        explanationEntryId = values.explanationEntryId;
      } else {
        const entryRes = await fetch("/api/teacher/explanations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: newRuleLabel.trim(), text: newRuleText.trim() }),
        });
        const entryData = await entryRes.json().catch(() => ({}));
        if (!entryRes.ok) {
          setSaving(false);
          setError(entryData.error ?? "Could not save the new rule.");
          return;
        }
        explanationEntryId = entryData.entry.id;
        setBankEntries((prev) => [...prev, entryData.entry].sort((a, b) => a.label.localeCompare(b.label)));
      }
    }

    const payload = fillInToPayload(values.fillIn);
    const body = {
      type: taskType,
      title: values.title.trim() || payload.text.replace(/\{[^}]+\}/g, "___"),
      instructions: values.instructions,
      isPublished: values.isPublished,
      categoryId: values.categoryId || null,
      explanation: values.explanation || "",
      explanationEntryId,
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
        fillIn: { text: "", blanks: [], displayMode: values.fillIn.displayMode },
        explanation: "",
        explanationEntryId: null,
      });
      setUseBank(false);
      setNewRuleLabel("");
      setNewRuleText("");
      textRef.current?.focus();
    } else {
      router.push(returnTo || "/teacher");
    }
  }

  const blankCount = countBlanks(values.fillIn.text);
  const previewPayload = fillInToPayload(values.fillIn);

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
            Topic <span className="font-normal text-gray-500">— {taskTypeLabel(taskType)}</span>
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
            {isSentence ? "Sentence" : "Text"} (put <code>___</code> where each gap should be)
          </label>
          <Textarea
            ref={textRef}
            rows={isSentence ? 3 : 8}
            placeholder={
              isSentence
                ? "She ___ to school every day."
                : "Yesterday I ___ to the shop and ___ some bread."
            }
            value={values.fillIn.text}
            onChange={(e) =>
              setValues({ ...values, fillIn: { ...values.fillIn, text: e.target.value } })
            }
          />
        </div>

        {blankCount > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Correct answer for each gap
            </label>
            <div className="flex flex-col gap-2">
              {values.fillIn.blanks.map((blank, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-sm text-gray-500">Gap {idx + 1}</span>
                  <Input value={blank} onChange={(e) => updateBlank(idx, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {isSentence && blankCount === 1 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              How students answer
            </label>
            <div className="flex flex-col gap-2">
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                  values.fillIn.displayMode === "type"
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  className="mt-1"
                  checked={values.fillIn.displayMode === "type"}
                  onChange={() => setDisplayMode("type")}
                />
                <span>
                  <span className="font-medium text-gray-900">Type the answer</span>
                  <span className="block text-gray-500">The student types the word themselves.</span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                  values.fillIn.displayMode === "cards"
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  className="mt-1"
                  checked={values.fillIn.displayMode === "cards"}
                  onChange={() => setDisplayMode("cards")}
                />
                <span>
                  <span className="font-medium text-gray-900">Prepositions cards</span>
                  <span className="block text-gray-500">
                    Tap a card from a curated set of prepositions, confirm to check. Only works
                    when the correct answer is a simple preposition.
                  </span>
                </span>
              </label>
            </div>

            {values.fillIn.displayMode === "cards" && (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Cards to show ({(values.fillIn.options ?? []).length}/12)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PREPOSITIONS.map((word) => {
                    const active = (values.fillIn.options ?? []).includes(word);
                    const isAnswer = values.fillIn.blanks[0]?.trim() === word;
                    return (
                      <button
                        key={word}
                        type="button"
                        onClick={() => toggleOption(word)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          active
                            ? "border-blue-400 bg-blue-100 text-blue-800"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        } ${isAnswer ? "ring-2 ring-green-400" : ""}`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Ringed in green = the correct answer. Pick 4–12 words total.
                </p>
              </div>
            )}
          </div>
        )}

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
          {values.fillIn.displayMode === "cards" && (
            <div className="mt-2">
              <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={useBank}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseBank(checked);
                    if (!checked) {
                      setValues({ ...values, explanationEntryId: null });
                      setNewRuleLabel("");
                      setNewRuleText("");
                    }
                  }}
                />
                <span>
                  <span className="font-medium">Use a reusable rule instead (a rule, not a one-liner)</span>
                  <span className="block text-gray-500">
                    Instead of showing text directly, the student sees a &quot;Read full
                    explanation&quot; link that opens it — use this when a short line can&apos;t
                    capture the distinction (e.g. &quot;connect to&quot; vs &quot;connect
                    with&quot;, or &quot;agree with/on/to&quot;). Pick a rule already written for
                    another sentence, or write a new one — either way, editing it later updates
                    every sentence that uses it.
                  </span>
                </span>
              </label>

              {useBank && (
                <div className="mt-2 rounded-lg border border-gray-200 p-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Rule</label>
                  <select
                    value={values.explanationEntryId ?? ""}
                    onChange={(e) =>
                      setValues({ ...values, explanationEntryId: e.target.value || null })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">+ Write a new rule</option>
                    {bankEntries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>

                  {values.explanationEntryId ? (
                    <p className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm text-gray-600">
                      {bankEntries.find((e) => e.id === values.explanationEntryId)?.text}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      <Input
                        placeholder='Short name for this rule, e.g. "apply for / apply to"'
                        value={newRuleLabel}
                        onChange={(e) => setNewRuleLabel(e.target.value)}
                      />
                      <Textarea
                        rows={5}
                        className="font-sans"
                        placeholder="The full rule text students will read"
                        value={newRuleText}
                        onChange={(e) => setNewRuleText(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        Manage all saved rules any time on the{" "}
                        <Link href="/teacher/explanations" className="text-blue-600 hover:underline">
                          rule bank
                        </Link>{" "}
                        page.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={values.isPublished}
            onChange={(e) => setValues({ ...values, isPublished: e.target.checked })}
          />
          Published (visible to students)
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Instructions shown to the student
          </label>
          <Textarea
            rows={3}
            className="font-sans"
            value={values.instructions}
            onChange={(e) => setValues({ ...values, instructions: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Add to this text if you want to note anything extra — it&apos;s shown above the
            question every time a student opens it.
          </p>
        </div>

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
                ✓ Added {addedCount} question{addedCount === 1 ? "" : "s"} this session
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
          {blankCount > 0 ? (
            <FillInBlankQuestion
              payload={previewPayload}
              answers={previewAnswers}
              onChange={(gapId, value) =>
                setPreviewAnswers((prev) => ({ ...prev, [gapId]: value }))
              }
              checkResult={null}
              instructions={values.instructions}
            />
          ) : (
            <p className="text-sm text-gray-400">
              Add a gap (<code>___</code>) to see a preview.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
