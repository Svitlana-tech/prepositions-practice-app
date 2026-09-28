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
 * so "mixed" doesn't reach outside the section they picked. `?group=` mixes just the
 * topics of one TOPIC_GROUPS entry (e.g. Everyday Prepositions).
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
  const groupParam = searchParams.get("group");

  useEffect(() => {
    const name = getStoredStudentName();
    if (!name) {
      router.replace("/");
      return;
    }
    setStudentName(name);
  }, [router]);

  if (!studentName) return null;

  // Tall bottom padding: in-app browsers (Telegram, iOS Safari) float their toolbar over
  // the page bottom, so the last button needs room to scroll up clear of it.
  return (
    <div className="mx-auto max-w-2xl px-6 pt-6 pb-40 md:max-w-3xl lg:max-w-4xl">
      {isTaskType(typeParam) ? (
        <PracticeSession
          // A different menu button (other topic/group) always starts a brand-new session,
          // even if the browser keeps this page alive between the two.
          key={`${round}|${typeParam}|${topicParam}|${groupParam}|${sectionParam}`}
          taskType={typeParam}
          categoryId={topicParam}
          group={groupParam}
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
