"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredStudentName } from "@/lib/studentName";
import { Card } from "@/components/ui/Card";

type TopicSummary = { id: string; name: string; count: number; endless?: boolean };

type TypeSummary = {
  type: string;
  label: string;
  description: string;
  totalCount: number;
  topics: TopicSummary[];
};

type SectionSummary = { id: string; name: string };

export default function SectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [types, setTypes] = useState<TypeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const name = getStoredStudentName();
    if (!name) {
      router.replace("/");
      return;
    }
    setStudentName(name);
    Promise.all([
      fetch("/api/sections").then((res) => res.json()),
      fetch(`/api/categories?sectionId=${params.id}`).then((res) => res.json()),
    ])
      .then(([sectionsData, categoriesData]) => {
        const sections: SectionSummary[] = sectionsData.sections ?? [];
        setSectionName(sections.find((s) => s.id === params.id)?.name ?? null);
        setTypes(categoriesData.types ?? []);
      })
      .finally(() => setLoading(false));
  }, [router, params.id]);

  if (!studentName) return null;

  const isEmpty = !loading && types.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
      <Link href="/tasks" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to sections
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{sectionName ?? "Practice"}</h1>

      {loading && <p className="text-gray-500">Loading...</p>}
      {isEmpty && <p className="text-gray-500">Nothing here yet — check back later.</p>}

      {types.map((t) => (
        <div key={t.type} className="mb-8 flex flex-col gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t.label}
            </div>
            <div className="text-sm text-gray-500">{t.description}</div>
          </div>

          {/* A type without topics is practiced as a single pool. */}
          <Link href={`/tasks/practice?type=${t.type}&section=${params.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="text-lg font-medium text-gray-900">
                {t.topics.length > 0 ? "🔀 All topics mixed" : "▶ Start practice"}
              </div>
              <div className="text-sm text-gray-500">{t.totalCount} question(s)</div>
            </Card>
          </Link>

          {t.topics.map((topic) => (
            <Link
              key={topic.id}
              href={
                topic.endless
                  ? `/tasks/cards/${topic.id}`
                  : `/tasks/practice?type=${t.type}&topic=${topic.id}&section=${params.id}`
              }
            >
              <Card className="transition-shadow hover:shadow-md">
                <div className="text-lg font-medium text-gray-900">{topic.name}</div>
                <div className="text-sm text-gray-500">
                  {topic.endless ? "Endless practice" : `${topic.count} question(s)`}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
