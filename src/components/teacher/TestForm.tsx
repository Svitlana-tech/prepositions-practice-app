"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { taskTypeLabel } from "@/lib/taskTypes";
import { fillInToPayload, countBlanks, type EditableFillIn } from "@/lib/fillInEditing";

type TaskSummary = {
  id: string;
  type: string;
  title: string;
  isPublished: boolean;
  categoryId: string | null;
  category: { name: string } | null;
};

type TestMode = "SELF_CHECK" | "TEACHER_REVIEW";

type Initial = {
  testId?: string;
  title: string;
  taskIds: string[];
  mode?: TestMode;
  questions?: TaskSummary[];
};

const NO_TOPIC = "__no_topic__";

const QUICK_ADD_TYPES = [
  { type: "SENTENCE_MCQ", label: "Missing word (4 options)" },
  { type: "FILL_IN_SENTENCE", label: "Type the missing word — sentence" },
  { type: "FILL_IN_TEXT", label: "Type the missing words — text" },
] as const;
type QuickAddType = (typeof QUICK_ADD_TYPES)[number]["type"];

export function TestForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [testMode, setTestMode] = useState<TestMode>(initial?.mode ?? "TEACHER_REVIEW");
  const [selected, setSelected] = useState<string[]>(initial?.taskIds ?? []);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"bank" | "new">("bank");
  const [newQuestionType, setNewQuestionType] = useState<QuickAddType>("SENTENCE_MCQ");
  // Questions written directly for this test: not in the /api/teacher/tasks bank
  // response, so we keep their id/title/type here to resolve the selected list.
  const [testOnlyTasks, setTestOnlyTasks] = useState<TaskSummary[]>(initial?.questions ?? []);

  useEffect(() => {
    fetch("/api/teacher/tasks")
      .then((res) => res.json())
      .then((data) => setTasks((data.tasks ?? []).filter((t: TaskSummary) => t.isPublished)))
      .finally(() => setLoading(false));
  }, []);

  const tasksById = useMemo(() => {
    const map = new Map<string, TaskSummary>();
    for (const t of tasks) map.set(t.id, t);
    for (const t of testOnlyTasks) map.set(t.id, t);
    return map;
  }, [tasks, testOnlyTasks]);

  const availableTypes = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) if (!map.has(t.type)) map.set(t.type, taskTypeLabel(t.type));
    return [...map.entries()];
  }, [tasks]);

  const topicsForType = useMemo(() => {
    if (!filterType) return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const t of tasks) {
      if (t.type !== filterType) continue;
      const key = t.categoryId ?? NO_TOPIC;
      if (!map.has(key)) map.set(key, { id: key, name: t.category?.name ?? "No topic" });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, filterType]);

  const isFiltering = Boolean(filterType || filterCategoryId || search.trim());

  const filtered = useMemo(() => {
    if (!isFiltering) return [];
    const q = search.trim().toLowerCase();
    let pool = tasks.filter((t) => !selected.includes(t.id));
    if (filterType) pool = pool.filter((t) => t.type === filterType);
    if (filterCategoryId) pool = pool.filter((t) => (t.categoryId ?? NO_TOPIC) === filterCategoryId);
    if (q) pool = pool.filter((t) => t.title.toLowerCase().includes(q));
    return pool;
  }, [tasks, selected, search, filterType, filterCategoryId, isFiltering]);

  const groups = useMemo(() => {
    const byTopic = new Map<string, { name: string; type: string; tasks: TaskSummary[] }>();
    for (const task of filtered) {
      const key = `${task.type}:${task.categoryId ?? NO_TOPIC}`;
      const name = task.category?.name ?? "No topic";
      if (!byTopic.has(key)) byTopic.set(key, { name, type: task.type, tasks: [] });
      byTopic.get(key)!.tasks.push(task);
    }
    return [...byTopic.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  function addTask(id: string) {
    setSelected((prev) => [...prev, id]);
  }
  function removeTask(id: string) {
    setSelected((prev) => prev.filter((tid) => tid !== id));
  }
  function move(idx: number, dir: -1 | 1) {
    setSelected((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Give the test a title.");
      return;
    }
    if (selected.length === 0) {
      setError("Add at least one question.");
      return;
    }
    setSaving(true);
    setError(null);
    const url = initial?.testId ? `/api/teacher/tests/${initial.testId}` : "/api/teacher/tests";
    const method = initial?.testId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), taskIds: selected, mode: testMode }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save the test.");
      return;
    }
    const data = await res.json();
    const id = data.test.id;
    setShareUrl(`${window.location.origin}/t/${id}`);
  }

  if (shareUrl) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-green-200 bg-green-50 p-6">
        <p className="font-medium text-green-900">Test saved! Share this link with your students:</p>
        <div className="flex gap-2">
          <Input readOnly value={shareUrl} onClick={(e) => e.currentTarget.select()} />
          <Button
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
            }}
          >
            Copy
          </Button>
        </div>
        <p className="text-sm text-green-800">
          Everyone who opens this link takes the exact same {selected.length} question
          {selected.length === 1 ? "" : "s"}, in the same order.
        </p>
        <Button variant="secondary" onClick={() => router.push("/teacher/tests")}>
          Back to Tests
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Test title</label>
          <Input
            value={title}
            placeholder="e.g. Conditionals — end of unit test"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            When a student finishes
          </label>
          <div className="flex flex-col gap-2">
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                testMode === "TEACHER_REVIEW" ? "border-blue-400 bg-blue-50" : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                className="mt-1"
                checked={testMode === "TEACHER_REVIEW"}
                onChange={() => setTestMode("TEACHER_REVIEW")}
              />
              <span>
                <span className="font-medium text-gray-900">Send to teacher for review</span>
                <span className="block text-gray-500">
                  The student just gets a &quot;submitted&quot; confirmation. You see the score and
                  every answer in detail on this test&apos;s results page.
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                testMode === "SELF_CHECK" ? "border-blue-400 bg-blue-50" : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                className="mt-1"
                checked={testMode === "SELF_CHECK"}
                onChange={() => setTestMode("SELF_CHECK")}
              />
              <span>
                <span className="font-medium text-gray-900">Self-check</span>
                <span className="block text-gray-500">
                  The student sees their score right away, plus the correct answers for anything
                  they got wrong. Good for practice links you hand out freely.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-2 rounded-lg bg-gray-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("bank")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
              mode === "bank" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Pick from task bank
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
              mode === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Write a new question
          </button>
        </div>

        {mode === "bank" && (
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setFilterCategoryId("");
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All question types</option>
                {availableTypes.map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                disabled={!filterType}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">All topics</option>
                {topicsForType.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              className="mb-3"
              placeholder="Or search by text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {loading && <p className="text-sm text-gray-500">Loading...</p>}
            {!loading && !isFiltering && (
              <p className="text-sm text-gray-500">
                Choose a question type and topic above (or search) to find questions.
              </p>
            )}
            {!loading && isFiltering && groups.length === 0 && (
              <p className="text-sm text-gray-500">No questions match.</p>
            )}
            <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
              {groups.map((group) => (
                <div key={`${group.type}:${group.name}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {taskTypeLabel(group.type)} · {group.name}
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    {group.tasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => addTask(t.id)}
                        className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:border-blue-400 hover:bg-blue-50"
                      >
                        <span className="text-gray-900">{t.title}</span>
                        <span className="text-blue-600">+ Add</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "new" && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Question type</label>
              <select
                value={newQuestionType}
                onChange={(e) => setNewQuestionType(e.target.value as QuickAddType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {QUICK_ADD_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {newQuestionType === "SENTENCE_MCQ" && (
              <QuickAddSentenceMcq
                onAdded={(task) => {
                  setTestOnlyTasks((prev) => [...prev, task]);
                  addTask(task.id);
                }}
              />
            )}
            {(newQuestionType === "FILL_IN_SENTENCE" || newQuestionType === "FILL_IN_TEXT") && (
              <QuickAddFillInBlank
                taskType={newQuestionType}
                onAdded={(task) => {
                  setTestOnlyTasks((prev) => [...prev, task]);
                  addTask(task.id);
                }}
              />
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save test & get link"}
        </Button>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-gray-500">
          Selected questions ({selected.length}) — this is the order students will see
        </div>
        {selected.length === 0 && (
          <p className="text-sm text-gray-400">Add questions from the left.</p>
        )}
        <div className="flex flex-col gap-2">
          {selected.map((id, idx) => {
            const task = tasksById.get(id);
            return (
              <div
                key={id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <div className="text-sm text-gray-900">
                  {idx + 1}. {task?.title ?? "(question no longer available)"}
                  {task && !tasks.some((b) => b.id === task.id) && (
                    <span className="ml-2 text-xs text-gray-400">(test-only)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="px-1 text-gray-500 hover:text-gray-900 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === selected.length - 1}
                    className="px-1 text-gray-500 hover:text-gray-900 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTask(id)}
                    className="px-1 text-red-500 hover:text-red-700"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Writes one SENTENCE_MCQ question straight into a test without adding it to the shared
 * task bank (inBank: false) — for questions the teacher only wants inside this one test,
 * e.g. a level check that shouldn't show up next to the exam-prep question pool.
 */
function QuickAddSentenceMcq({ onAdded }: { onAdded: (task: TaskSummary) => void }) {
  const [sentence, setSentence] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  function updateOption(idx: number, text: string) {
    const next = [...options];
    next[idx] = text;
    setOptions(next);
  }

  async function handleAdd() {
    if (!sentence.includes("___")) {
      setError('Put "___" where the gap should be.');
      return;
    }
    if (options.some((o) => !o.trim())) {
      setError("Fill in all 4 options.");
      return;
    }
    if (correctIndex === null) {
      setError("Mark which option is correct.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/teacher/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "SENTENCE_MCQ",
        title: sentence.trim(),
        isPublished: true,
        inBank: false,
        payload: { sentence, options, correctIndex },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add this question.");
      return;
    }
    const data = await res.json();
    onAdded({
      id: data.task.id,
      type: data.task.type,
      title: data.task.title,
      isPublished: true,
      categoryId: null,
      category: null,
    });
    setAddedCount((n) => n + 1);
    setSentence("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-500">
        This question is added only to this test — it won&apos;t appear in your task bank or in
        random practice.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Sentence (put <code>___</code> where the gap should be)
        </label>
        <Input
          placeholder="She ___ to school every day."
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          4 answer options (mark the correct one)
        </label>
        <div className="flex flex-col gap-2">
          {options.map((option, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name="quickAddCorrectIndex"
                checked={correctIndex === idx}
                onChange={() => setCorrectIndex(idx)}
              />
              <Input value={option} onChange={(e) => updateOption(idx, e.target.value)} />
            </div>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={handleAdd} disabled={saving}>
          {saving ? "Adding..." : "+ Add to this test"}
        </Button>
        {addedCount > 0 && (
          <span className="text-sm text-green-700">
            ✓ Added {addedCount} question{addedCount === 1 ? "" : "s"} this session
          </span>
        )}
      </div>
    </div>
  );
}

const FILL_IN_DEFAULT_INSTRUCTIONS =
  'Type the missing word or phrase exactly as it should appear. Write full forms — no ' +
  'contractions (e.g. "do not", not "don\'t") when the answer is more than one word. ' +
  "Capital and lowercase letters matter, so match the case the sentence needs.";

/**
 * Writes one FILL_IN_SENTENCE/FILL_IN_TEXT question straight into a test without adding it to
 * the shared task bank (inBank: false) — mirrors QuickAddSentenceMcq above.
 */
function QuickAddFillInBlank({
  taskType,
  onAdded,
}: {
  taskType: "FILL_IN_SENTENCE" | "FILL_IN_TEXT";
  onAdded: (task: TaskSummary) => void;
}) {
  const [fillIn, setFillIn] = useState<EditableFillIn>({ text: "", blanks: [], displayMode: "type" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  const blankCount = countBlanks(fillIn.text);

  useEffect(() => {
    const count = countBlanks(fillIn.text);
    setFillIn((v) => {
      if (v.blanks.length === count) return v;
      const next = [...v.blanks];
      while (next.length < count) next.push("");
      next.length = count;
      return { ...v, blanks: next };
    });
  }, [fillIn.text]);

  function updateBlank(idx: number, value: string) {
    const next = [...fillIn.blanks];
    next[idx] = value;
    setFillIn({ ...fillIn, blanks: next });
  }

  async function handleAdd() {
    if (blankCount === 0) {
      setError('Put "___" where each gap should be.');
      return;
    }
    if (fillIn.blanks.some((b) => !b.trim())) {
      setError("Fill in the correct answer for every gap.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = fillInToPayload(fillIn);
    const res = await fetch("/api/teacher/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: taskType,
        title: payload.text.replace(/\{[^}]+\}/g, "___"),
        instructions: FILL_IN_DEFAULT_INSTRUCTIONS,
        isPublished: true,
        inBank: false,
        payload,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add this question.");
      return;
    }
    const data = await res.json();
    onAdded({
      id: data.task.id,
      type: data.task.type,
      title: data.task.title,
      isPublished: true,
      categoryId: null,
      category: null,
    });
    setAddedCount((n) => n + 1);
    setFillIn({ text: "", blanks: [], displayMode: "type" });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-500">
        This question is added only to this test — it won&apos;t appear in your task bank or in
        random practice.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {taskType === "FILL_IN_SENTENCE" ? "Sentence" : "Text"} (put <code>___</code> where each
          gap should be)
        </label>
        <Textarea
          rows={taskType === "FILL_IN_SENTENCE" ? 2 : 6}
          placeholder={
            taskType === "FILL_IN_SENTENCE"
              ? "She ___ to school every day."
              : "Yesterday I ___ to the shop and ___ some bread."
          }
          value={fillIn.text}
          onChange={(e) => setFillIn({ ...fillIn, text: e.target.value })}
        />
      </div>
      {blankCount > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Correct answer for each gap
          </label>
          <div className="flex flex-col gap-2">
            {fillIn.blanks.map((blank, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-sm text-gray-500">Gap {idx + 1}</span>
                <Input value={blank} onChange={(e) => updateBlank(idx, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={handleAdd} disabled={saving}>
          {saving ? "Adding..." : "+ Add to this test"}
        </Button>
        {addedCount > 0 && (
          <span className="text-sm text-green-700">
            ✓ Added {addedCount} question{addedCount === 1 ? "" : "s"} this session
          </span>
        )}
      </div>
    </div>
  );
}
