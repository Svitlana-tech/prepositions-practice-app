"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AVAILABLE_TASK_TYPES, TASK_TYPES, type TaskTypeInfo } from "@/lib/taskTypes";

type Category = {
  id: string;
  name: string;
  taskType: string;
  sectionId: string | null;
  _count: { tasks: number };
};

type Section = { id: string; name: string };

type TaskSummary = {
  id: string;
  type: string;
  title: string;
  points: number;
  isPublished: boolean;
  categoryId: string | null;
};

const comingSoonTypes = TASK_TYPES.filter((t) => !t.available);

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  /** New-topic input text, kept per question type. */
  const [newNames, setNewNames] = useState<Record<string, string>>({});
  /** New-topic section choice, kept per question type. */
  const [newSectionIds, setNewSectionIds] = useState<Record<string, string>>({});
  const [savingType, setSavingType] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [confirmingCategoryId, setConfirmingCategoryId] = useState<string | null>(null);
  const [confirmingTaskId, setConfirmingTaskId] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/teacher/categories").then((res) => res.json()),
      fetch("/api/teacher/tasks").then((res) => res.json()),
      fetch("/api/teacher/sections").then((res) => res.json()),
    ])
      .then(([categoriesData, tasksData, sectionsData]) => {
        setCategories(categoriesData.categories ?? []);
        setTasks(tasksData.tasks ?? []);
        setSections(sectionsData.sections ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd(taskType: string) {
    const name = (newNames[taskType] ?? "").trim();
    if (!name) return;
    setSavingType(taskType);
    setErrors((prev) => ({ ...prev, [taskType]: null }));
    const res = await fetch("/api/teacher/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, taskType, sectionId: newSectionIds[taskType] || undefined }),
    });
    setSavingType(null);
    if (res.ok) {
      setNewNames((prev) => ({ ...prev, [taskType]: "" }));
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setErrors((prev) => ({ ...prev, [taskType]: data.error ?? "Could not add the topic." }));
    }
  }

  async function handleSectionChange(categoryId: string, sectionId: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, sectionId: sectionId || null } : c))
    );
    await fetch(`/api/teacher/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: sectionId || null }),
    });
  }

  async function handleDeleteCategory(id: string) {
    await fetch(`/api/teacher/categories/${id}`, { method: "DELETE" });
    setConfirmingCategoryId(null);
    load();
  }

  async function handleDeleteTask(id: string) {
    await fetch(`/api/teacher/tasks/${id}`, { method: "DELETE" });
    setConfirmingTaskId(null);
    load();
  }

  function startRename(c: Category) {
    setRenamingId(c.id);
    setRenameValue(c.name);
    setRenameError(null);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
    setRenameError(null);
  }

  async function saveRename(id: string) {
    if (!renameValue.trim()) return;
    setRenameSaving(true);
    setRenameError(null);
    const res = await fetch(`/api/teacher/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    setRenameSaving(false);
    if (res.ok) {
      cancelRename();
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setRenameError(data.error ?? "Could not rename the topic.");
    }
  }

  function renderTaskCard(task: TaskSummary, returnTo: string) {
    return (
      <Card key={task.id} className="flex items-center justify-between">
        <div>
          <div className="text-lg font-medium text-gray-900">{task.title}</div>
          <div className="text-sm text-gray-500">
            {task.points} point(s) · {task.isPublished ? "published" : "draft"}
          </div>
        </div>
        <div className="flex gap-2">
          {confirmingTaskId === task.id ? (
            <>
              <Button variant="secondary" onClick={() => setConfirmingTaskId(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDeleteTask(task.id)}>
                Really delete?
              </Button>
            </>
          ) : (
            <>
              <Link href={`/teacher/tasks/${task.id}/edit?returnTo=${encodeURIComponent(returnTo)}`}>
                <Button variant="secondary">Edit</Button>
              </Link>
              <Button variant="danger" onClick={() => setConfirmingTaskId(task.id)}>
                Delete
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  function renderTypeSection(info: TaskTypeInfo) {
    const returnTo = "/teacher/categories";
    const typeCategories = categories.filter((c) => c.taskType === info.type);
    const typeTasks = tasks.filter((t) => t.type === info.type);
    const looseTasks = typeTasks.filter((t) => !t.categoryId);
    const addName = newNames[info.type] ?? "";

    return (
      <section key={info.type} className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">{info.label}</h2>
        <p className="mb-4 text-sm text-gray-500">
          {info.description} · {typeTasks.length} question(s) in total
        </p>

        <div className="mb-2 flex gap-2">
          <Input
            placeholder={`New topic for ${info.label}`}
            value={addName}
            onChange={(e) => setNewNames((prev) => ({ ...prev, [info.type]: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleAdd(info.type)}
          />
          <select
            value={newSectionIds[info.type] ?? ""}
            onChange={(e) => setNewSectionIds((prev) => ({ ...prev, [info.type]: e.target.value }))}
            className="rounded-lg border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">No section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button
            onClick={() => handleAdd(info.type)}
            disabled={savingType === info.type || !addName.trim()}
          >
            Add topic
          </Button>
        </div>
        {errors[info.type] && <p className="mb-2 text-sm text-red-600">{errors[info.type]}</p>}

        <div className="mt-4 flex flex-col gap-3">
          {typeCategories.length === 0 && (
            <p className="text-sm text-gray-500">
              No topics here yet — questions of this type are simply listed without a topic.
            </p>
          )}

          {typeCategories.map((c) => {
            const categoryTasks = typeTasks.filter((t) => t.categoryId === c.id);
            const isRenaming = renamingId === c.id;
            return (
              <details key={c.id} className="rounded-xl border border-gray-200">
                <summary className="flex cursor-pointer select-none list-none items-center justify-between px-4 py-3">
                  {isRenaming ? (
                    <div
                      className="flex flex-1 items-center gap-2"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveRename(c.id)}
                        className="max-w-xs"
                      />
                      <Button
                        variant="secondary"
                        disabled={renameSaving}
                        onClick={() => saveRename(c.id)}
                      >
                        Save
                      </Button>
                      <Button variant="secondary" onClick={cancelRename}>
                        Cancel
                      </Button>
                      {renameError && <span className="text-sm text-red-600">{renameError}</span>}
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-sm text-gray-500">{c._count.tasks} question(s)</div>
                    </div>
                  )}

                  {!isRenaming && (
                    <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                      <select
                        value={c.sectionId ?? ""}
                        onChange={(e) => handleSectionChange(c.id, e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">No section</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <Button variant="secondary" onClick={() => startRename(c)}>
                        Rename
                      </Button>
                      {confirmingCategoryId === c.id ? (
                        <>
                          <Button variant="secondary" onClick={() => setConfirmingCategoryId(null)}>
                            Cancel
                          </Button>
                          <Button variant="danger" onClick={() => handleDeleteCategory(c.id)}>
                            Really delete?
                          </Button>
                        </>
                      ) : (
                        <Button variant="danger" onClick={() => setConfirmingCategoryId(c.id)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </summary>

                <div className="flex flex-col gap-3 border-t border-gray-100 p-4">
                  <div>
                    <Link
                      href={`${info.newHref}?categoryId=${c.id}&returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      <Button variant="secondary">+ Add question</Button>
                    </Link>
                  </div>
                  {categoryTasks.length === 0 && (
                    <p className="text-sm text-gray-500">No questions in this topic yet.</p>
                  )}
                  {categoryTasks.map((task) => renderTaskCard(task, returnTo))}
                </div>
              </details>
            );
          })}

          {looseTasks.length > 0 && (
            <details className="rounded-xl border border-dashed border-gray-300">
              <summary className="cursor-pointer select-none px-4 py-3">
                <span className="font-medium text-gray-900">No topic</span>{" "}
                <span className="text-sm text-gray-500">({looseTasks.length} question(s))</span>
              </summary>
              <div className="flex flex-col gap-3 border-t border-gray-100 p-4">
                {looseTasks.map((task) => renderTaskCard(task, returnTo))}
              </div>
            </details>
          )}
        </div>

        <div className="mt-4">
          <Link href={`${info.newHref}?returnTo=${encodeURIComponent(returnTo)}`}>
            <Button variant="secondary">+ Add question without a topic</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Topics</h1>
      <p className="mb-6 text-sm text-gray-500">
        Every question type keeps its own topics. Grammar topics such as Conditionals belong to
        &quot;Missing word in a sentence&quot;; another type can have completely different topics, or
        none at all.
      </p>

      {loading && <p className="text-gray-500">Loading...</p>}

      {!loading && (
        <div className="flex flex-col gap-5">
          {AVAILABLE_TASK_TYPES.map(renderTypeSection)}

          {comingSoonTypes.length > 0 && (
            <p className="text-sm text-gray-400">
              Coming soon: {comingSoonTypes.map((t) => t.label).join(", ")}. Each will get its own
              topics here once its question form is ready.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
