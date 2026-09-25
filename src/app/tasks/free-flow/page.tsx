"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredStudentName } from "@/lib/studentName";
import { PrepositionCardsDeck } from "@/components/student/PrepositionCardsDeck";

/**
 * Free Flow: the endless full-screen cards deck over every topic — no nav, no back link,
 * no score, just the cards edge to edge. The phone's own back gesture/button is how a
 * student leaves (or "Rest" on the break screen every 20 cards).
 */
export default function FreeFlowPage() {
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

  return <PrepositionCardsDeck />;
}
