"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TestForm } from "@/components/teacher/TestForm";

type Question = {
  id: string;
  type: string;
  title: string;
  isPublished: boolean;
  categoryId: string | null;
  category: { name: string } | null;
};

type TestDetail = {
  id: string;
  title: string;
  mode: "SELF_CHECK" | "TEACHER_REVIEW";
  taskIds: string[];
  questions: Question[];
};

export default function EditTestPage() {
  const params = useParams<{ id: string }>();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/teacher/tests/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setTest(data.test))
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) return <p className="text-red-600">Test not found.</p>;
  if (!test) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Edit Test</h1>
      <TestForm
        initial={{
          testId: test.id,
          title: test.title,
          mode: test.mode,
          taskIds: test.taskIds,
          questions: test.questions,
        }}
      />
    </div>
  );
}
