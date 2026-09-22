"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FillInBlankForm } from "@/components/teacher/FillInBlankForm";
import { payloadToEditableFillIn } from "@/lib/fillInEditing";
import type { FillInBlankPayload } from "@/lib/taskSchemas";

type Task = {
  id: string;
  type: string;
  title: string;
  instructions: string | null;
  isPublished: boolean;
  categoryId: string | null;
  explanation: string | null;
  explanationEntryId: string | null;
  payload: unknown;
};

export default function EditTaskPage() {
  const params = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/teacher/tasks/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setTask(data.task))
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) return <p className="text-red-600">Task not found.</p>;
  if (!task) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Edit Task</h1>
      <Suspense>
        {(task.type === "FILL_IN_SENTENCE" || task.type === "FILL_IN_TEXT") && (
          <FillInBlankForm
            taskType={task.type}
            initial={{
              taskId: task.id,
              title: task.title,
              instructions: task.instructions ?? "",
              fillIn: payloadToEditableFillIn(task.payload as FillInBlankPayload),
              isPublished: task.isPublished,
              categoryId: task.categoryId,
              explanation: task.explanation ?? "",
              explanationEntryId: task.explanationEntryId ?? null,
            }}
          />
        )}
        {task.type !== "FILL_IN_SENTENCE" && task.type !== "FILL_IN_TEXT" && (
          <p className="text-gray-500">Editing this task type isn&apos;t supported yet.</p>
        )}
      </Suspense>
    </div>
  );
}
