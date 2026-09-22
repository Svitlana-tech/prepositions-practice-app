"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearStoredStudentName, getStoredStudentName } from "@/lib/studentName";
import { Card } from "@/components/ui/Card";

type SectionSummary = { id: string; name: string };

export default function TasksPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const name = getStoredStudentName();
    if (!name) {
      router.replace("/");
      return;
    }
    setStudentName(name);
    fetch("/api/sections")
      .then((res) => res.json())
      .then((data) => setSections(data.sections ?? []))
      .finally(() => setLoading(false));
  }, [router]);

  function handleNotYou() {
    clearStoredStudentName();
    router.replace("/");
  }

  if (!studentName) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Hi, {studentName}!</h1>
          <p className="text-gray-600">What do you want to practice?</p>
        </div>
        <button onClick={handleNotYou} className="text-sm text-blue-600 hover:underline">
          Not me
        </button>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && sections.length === 0 && (
        <p className="text-gray-500">No sections yet. Check back later.</p>
      )}

      <div className="flex flex-col gap-3">
        {sections.map((s) => (
          <Link key={s.id} href={`/tasks/section/${s.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="text-lg font-medium text-gray-900">{s.name}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
