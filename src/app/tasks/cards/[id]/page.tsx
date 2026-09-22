"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStoredStudentName } from "@/lib/studentName";
import { PrepositionCardsDeck } from "@/components/student/PrepositionCardsDeck";

/**
 * Dedicated full-screen page for a topic where every task is the preposition cards
 * grid (see the `endless` flag from /api/categories) — no nav, no back link, no question
 * counter, just the cards themselves edge to edge. The phone's own back gesture/button
 * is how a student leaves; nothing here needs to reproduce that.
 */
export default function PrepositionCardsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [studentName, setStudentName] = useState<string | null>(null);

  useEffect(() => {
    const name = getStoredStudentName();
    if (!name) {
      router.replace("/");
      return;
    }
    setStudentName(name);
  }, [router]);

  if (!studentName) return null;

  return <PrepositionCardsDeck categoryId={params.id} />;
}
