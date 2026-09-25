"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getStoredStudentName } from "@/lib/studentName";
import { PracticeSession } from "@/components/student/PracticeSession";
import { isTaskType } from "@/lib/taskTypes";

/**
 * A session is always scoped to one question type (`?type=`); `?topic=` narrows it
 * to a single topic of that type, and leaving it out mixes all of the type's questions
 * — scoped to `?section=` (the section the student came from) when a topic isn't given,
 * so "mixed" doesn't reach outside the section they picked.
 */
function PracticeScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [studentName, setStudentName] = useState<string | null>(null);
  // Bumped by "Repeat Topic" to remount a fresh session.
  const [round, setRound] = useState(0);

  const typeParam = searchParams.get("type");
  const topicParam = searchParams.get("topic");
  const sectionParam = searchParams.get("section");

  useEffect(() => {
    const name = getStoredStudentName();
    if (!name) {
      router.replace("/");
      return;
    }
    setStudentName(name);
  }, [router]);

  if (!studentName) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
      {isTaskType(typeParam) ? (
        <PracticeSession
          key={round}
          taskType={typeParam}
          categoryId={topicParam}
          sectionId={sectionParam}
          onRepeat={() => setRound((r) => r + 1)}
        />
      ) : (
        <p className="text-red-600">Choose an exercise from the list first.</p>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense>
      <PracticeScreen />
    </Suspense>
  );
}
