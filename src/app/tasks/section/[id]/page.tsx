"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { clearStoredStudentName, getStoredStudentName } from "@/lib/studentName";
import { getCategoryTheme, MIX_THEME } from "@/lib/categoryTheme";

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
  const [multipleSections, setMultipleSections] = useState(false);
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
        setMultipleSections(sections.length > 1);
        setTypes(categoriesData.types ?? []);
      })
      .finally(() => setLoading(false));
  }, [router, params.id]);

  function handleNotYou() {
    clearStoredStudentName();
    router.replace("/");
  }

  if (!studentName) return null;

  const isEmpty = !loading && types.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
      {multipleSections && (
        <Link href="/tasks" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to sections
        </Link>
      )}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Hi, {studentName}!</h1>
          <p className="text-gray-600">{sectionName ?? "What do you want to practice?"}</p>
        </div>
        <button onClick={handleNotYou} className="text-sm text-blue-600 hover:underline">
          Not me
        </button>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {isEmpty && <p className="text-gray-500">Nothing here yet — check back later.</p>}

      {types.map((t) => (
        <div key={t.type} className="mb-8 flex flex-col gap-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t.label}
            </div>
            <div className="text-sm text-gray-500">{t.description}</div>
          </div>

          {/* A type without topics is practiced as a single pool. */}
          <Link href={`/tasks/practice?type=${t.type}&section=${params.id}`}>
            <div
              className="flex items-center justify-between rounded-2xl p-5 transition-transform hover:scale-[1.01]"
              style={{ background: MIX_THEME.bg, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            >
              <div>
                <div className="text-lg font-bold" style={{ color: MIX_THEME.text }}>
                  {t.topics.length > 0 ? "⚡ All topics mixed" : "▶ Start practice"}
                </div>
                <div className="text-sm" style={{ color: MIX_THEME.accent }}>
                  {t.totalCount} question(s)
                </div>
              </div>
            </div>
          </Link>

          {t.topics.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {t.topics.map((topic) => {
                const theme = getCategoryTheme(topic.name);
                return (
                  <Link
                    key={topic.id}
                    href={
                      topic.endless
                        ? `/tasks/cards/${topic.id}`
                        : `/tasks/practice?type=${t.type}&topic=${topic.id}&section=${params.id}`
                    }
                  >
                    <div
                      className="flex h-full items-start gap-3 rounded-2xl p-4 transition-transform hover:scale-[1.01]"
                      style={{ background: theme.bg, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                    >
                      <div className="text-2xl leading-none">{theme.icon}</div>
                      <div>
                        <div className="font-semibold" style={{ color: theme.accent }}>
                          {topic.name}
                        </div>
                        <div className="text-sm opacity-70" style={{ color: theme.accent }}>
                          {topic.endless ? "Endless practice" : `${topic.count} question(s)`}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
