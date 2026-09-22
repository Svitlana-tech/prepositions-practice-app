"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredStudentName } from "@/lib/studentName";
import { TaskPlayerSentenceMcq } from "@/components/student/TaskPlayerSentenceMcq";

type Task = {
  id: string;
  type: string;
  title: string;
  instructions: string | null;
  points: number;
  payload: unknown;
};

export default function TaskPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const name = getStoredStudentName();
    if (!name) {
      router.replace("/");
      return;
    }
    setStudentName(name);
    fetch(`/api/tasks/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(setTask)
      .catch(() => setError("Task not found."));
  }, [params.id, router]);

  async function submitAnswers(answers: unknown) {
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: params.id, studentName, answers }),
    });
    return res.json();
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
        <p className="text-red-600">{error}</p>
        <Link href="/tasks" className="text-blue-600 hover:underline">
          ← Back to task list
        </Link>
      </div>
    );
  }

  if (!studentName || !task) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
      <Link href="/tasks" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to task list
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">{task.title}</h1>
      {task.instructions && <p className="mb-6 text-gray-600">{task.instructions}</p>}

      {task.type === "SENTENCE_MCQ" && (
        <TaskPlayerSentenceMcq
          payload={task.payload as { sentence: string; options: string[] }}
          onSubmit={submitAnswers}
        />
      )}
      {task.type !== "SENTENCE_MCQ" && (
        <p className="text-gray-500">This task type isn&apos;t supported in the app yet.</p>
      )}
    </div>
  );
}
