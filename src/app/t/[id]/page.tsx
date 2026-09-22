"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getStoredStudentName, setStoredStudentName } from "@/lib/studentName";
import { TestSession } from "@/components/student/TestSession";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** Public: a shared test link. Anyone with the link can enter their name and take it. */
export default function SharedTestPage() {
  const params = useParams<{ id: string }>();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    setStudentName(getStoredStudentName());
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setStoredStudentName(trimmed);
    setStudentName(trimmed);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
      {studentName ? (
        <TestSession testId={params.id} studentName={studentName} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              What&apos;s your name?
            </label>
            <Input
              id="name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={!nameInput.trim()}>
            Start test
          </Button>
        </form>
      )}
    </div>
  );
}
