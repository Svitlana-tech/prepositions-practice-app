"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearStoredStudentName, getStoredStudentName } from "@/lib/studentName";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

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
      .then((data) => {
        const list: SectionSummary[] = data.sections ?? [];
        // Only one section to choose from — skip the picker and go straight in.
        if (list.length === 1) {
          router.replace(`/tasks/section/${list[0].id}`);
          return;
        }
        setSections(list);
        setLoading(false);
      });
  }, [router]);

  function handleNotYou() {
    clearStoredStudentName();
    router.replace("/");
  }

  if (!studentName) return null;

  // With a single section (the usual case) this page only redirects to its menu, so it
  // shows nothing but the spinner on the way there.
  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Hi, {studentName}!</h1>
        <button onClick={handleNotYou} className="text-sm text-blue-600 hover:underline">
          Not me
        </button>
      </div>

      {sections.length === 0 && (
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
