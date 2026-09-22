"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TASK_TYPES, taskTypeLabel } from "@/lib/taskTypes";

type TaskSummary = {
  id: string;
  type: string;
  title: string;
  points: number;
  isPublished: boolean;
  categoryId: string | null;
  category: { name: string } | null;
  payload: unknown;
};

const NO_TOPIC = "__no_topic__";

function searchableText(task: TaskSummary): string {
  const payloadSentence =
    task.payload && typeof task.payload === "object" && "sentence" in task.payload
      ? String((task.payload as { sentence?: unknown }).sentence ?? "")
      : "";
  return `${task.title} ${payloadSentence}`.toLowerCase();
}

export default function TeacherDashboard() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/teacher/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id: string) {
    await fetch(`/api/teacher/tasks/${id}`, { method: "DELETE" });
    setConfirmingId(null);
    load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => searchableText(t).includes(q));
  }, [tasks, search]);

  /**
   * Question type is the outer grouping, topic the inner one — the same order the
   * teacher follows when creating a question. Topic names are only unique within a
   * type, so they are grouped by id, not by name.
   */
  const typeGroups = useMemo(() => {
    return TASK_TYPES.map((info) => {
      const typeTasks = filtered.filter((t) => t.type === info.type);
      const byTopic = new Map<string, { name: string; tasks: TaskSummary[] }>();
      for (const task of typeTasks) {
        const key = task.categoryId ?? NO_TOPIC;
        const name = task.category?.name ?? "No topic";
        if (!byTopic.has(key)) byTopic.set(key, { name, tasks: [] });
        byTopic.get(key)!.tasks.push(task);
      }
      const topics = [...byTopic.values()].sort((a, b) => {
        if (a.name === "No topic") return 1;
        if (b.name === "No topic") return -1;
        return a.name.localeCompare(b.name);
      });
      return { info, count: typeTasks.length, topics };
    }).filter((g) => g.count > 0);
  }, [filtered]);

  const isSearching = search.trim().length > 0;

  function renderTaskCard(task: TaskSummary) {
    return (
      <Card key={task.id} className="flex items-center justify-between">
        <div>
          {isSearching && (
            <div className="text-xs font-medium uppercase tracking-wide text-blue-600">
              {taskTypeLabel(task.type)}
            </div>
          )}
          <div className="text-lg font-medium text-gray-900">{task.title}</div>
          <div className="text-sm text-gray-500">
            {task.points} point(s) · {task.isPublished ? "published" : "draft"}
            {isSearching && task.category?.name ? ` · ${task.category.name}` : ""}
          </div>
        </div>
        <div className="flex gap-2">
          {confirmingId === task.id ? (
            <>
              <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(task.id)}>
                Really delete?
              </Button>
            </>
          ) : (
            <>
              <Link href={`/teacher/tasks/${task.id}/edit`}>
                <Button variant="secondary">Edit</Button>
              </Link>
              <Button variant="danger" onClick={() => setConfirmingId(task.id)}>
                Delete
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Task Bank</h1>
        <Link href="/teacher/tasks/new">
          <Button>+ New Task</Button>
        </Link>
      </div>

      {!loading && tasks.length > 0 && (
        <Input
          className="mb-6"
          placeholder="Search by sentence or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && tasks.length === 0 && <p className="text-gray-500">No tasks yet.</p>}
      {!loading && tasks.length > 0 && filtered.length === 0 && (
        <p className="text-gray-500">No tasks match &quot;{search}&quot;.</p>
      )}

      {isSearching ? (
        <div className="flex flex-col gap-3">{filtered.map(renderTaskCard)}</div>
      ) : (
        <div className="flex flex-col gap-5">
          {typeGroups.map(({ info, count, topics }) => (
            <section key={info.type} className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {info.label} <span className="font-normal text-gray-500">({count})</span>
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {topics.map((topic) => (
                  <details
                    key={`${info.type}:${topic.name}`}
                    className="rounded-xl border border-gray-200"
                    open={topics.length <= 1}
                  >
                    <summary className="cursor-pointer select-none px-4 py-3 font-medium text-gray-900">
                      {topic.name}{" "}
                      <span className="font-normal text-gray-500">({topic.tasks.length})</span>
                    </summary>
                    <div className="flex flex-col gap-3 border-t border-gray-100 p-4">
                      {topic.tasks.map(renderTaskCard)}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
