"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setStoredStudentName } from "@/lib/studentName";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function NameCaptureForm() {
  const [name, setName] = useState("");
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setStoredStudentName(trimmed);
    router.push("/tasks");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          What&apos;s your name?
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          autoFocus
        />
      </div>
      <Button type="submit" disabled={!name.trim()}>
        Start
      </Button>
    </form>
  );
}
