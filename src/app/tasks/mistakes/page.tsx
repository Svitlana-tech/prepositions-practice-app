"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredStudentName } from "@/lib/studentName";
import { getMistakeIds } from "@/lib/mistakes";
import { shuffle } from "@/lib/shuffle";
import { PracticeSession } from "@/components/student/PracticeSession";

const SESSION_SIZE = 10;

/**
 * Fix Mistakes: up to 10 random sentences from this student's own mistakes pool
 * (see lib/mistakes). Getting one right here takes it out of the pool.
 */
export default function FixMistakesPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [taskIds, setTaskIds] = useState<string[] | null>(null);
  // Bumped by "Repeat Topic" to remount a fresh session over the (now smaller) pool.
  const [round, setRound] = useState(0);

  useEffect(() => {
    const name = getStoredStudentName();
    if (!name) {
      router.replace("/");
      return;
    }
    setStudentName(name);
    setTaskIds(shuffle(getMistakeIds()).slice(0, SESSION_SIZE));
  }, [router]);

  if (!studentName || !taskIds) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Fix Mistakes</h1>
      {taskIds.length === 0 ? (
        <p className="text-gray-600">No mistakes to fix — great job! 🎉</p>
      ) : (
        <PracticeSession
          key={round}
          presetTaskIds={taskIds}
          onRepeat={() => {
            setTaskIds(shuffle(getMistakeIds()).slice(0, SESSION_SIZE));
            setRound((r) => r + 1);
          }}
        />
      )}
    </div>
  );
}
