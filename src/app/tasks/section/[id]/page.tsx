"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { clearStoredStudentName, getStoredStudentName } from "@/lib/studentName";
import { FIX_MISTAKES_THEME, getCategoryTheme } from "@/lib/categoryTheme";
import { ACADEMIC_TOPIC_NAME, FREE_FLOW_TOPIC_NAMES } from "@/lib/topics";
import { getMistakeIds } from "@/lib/mistakes";

type TopicSummary = { id: string; name: string; count: number };

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
  const [multipleSections, setMultipleSections] = useState(false);
  const [types, setTypes] = useState<TypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [mistakeCount, setMistakeCount] = useState(0);

  useEffect(() => {
    const name = getStoredStudentName();
    if (!name) {
      router.replace("/");
      return;
    }
    setStudentName(name);
    setMistakeCount(getMistakeIds().length);
    Promise.all([
      fetch("/api/sections").then((res) => res.json()),
      fetch(`/api/categories?sectionId=${params.id}`).then((res) => res.json()),
    ])
      .then(([sectionsData, categoriesData]) => {
        const sections: SectionSummary[] = sectionsData.sections ?? [];
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

  // Tall bottom padding: phone browsers (Telegram, iOS Safari) float their toolbar over
  // the page bottom, so the last topic card needs room to scroll up clear of it.
  return (
    <div className="mx-auto max-w-2xl px-6 pt-10 pb-40 md:max-w-3xl lg:max-w-4xl">
      {multipleSections && (
        <Link href="/tasks" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to sections
        </Link>
      )}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Hi, {studentName}!</h1>
        <button onClick={handleNotYou} className="text-sm text-blue-600 hover:underline">
          Not me
        </button>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {isEmpty && <p className="text-gray-500">Nothing here yet — check back later.</p>}

      {types.map((t) => {
        const byName = new Map(t.topics.map((topic) => [topic.name, topic]));
        const hrefFor = (topic: TopicSummary) =>
          `/tasks/practice?type=${t.type}&topic=${topic.id}&section=${params.id}`;
        const placed = new Set(GRID_ROWS.flatMap((row) => row.items));
        // Topics added later that the layout doesn't know yet still get a tile, at the end.
        const extras = t.topics.filter((topic) => !placed.has(topic.name));
        const freeFlowTheme = getCategoryTheme(FREE_FLOW_TOPIC_NAMES[0]);

        const tiles = [
          ...GRID_ROWS.flatMap((row) => {
            const theme = getCategoryTheme(row.colorOf);
            return row.items.map((item) => {
              if (item === FIX_MISTAKES) {
                return (
                  <SquareTile
                    key={item}
                    href="/tasks/mistakes"
                    icon={FIX_MISTAKES_THEME.icon}
                    name="Fix Mistakes"
                    subtitle={mistakeCount === 0 ? "none yet" : `${mistakeCount} to fix`}
                    bg={theme.bg}
                    accent={theme.accent}
                  />
                );
              }
              const topic = byName.get(item);
              if (!topic) return null;
              return (
                <SquareTile
                  key={topic.id}
                  href={hrefFor(topic)}
                  icon={getCategoryTheme(topic.name).icon}
                  name={topic.name}
                  bg={theme.bg}
                  accent={theme.accent}
                />
              );
            });
          }),
          ...extras.map((topic) => {
            const theme = getCategoryTheme(topic.name);
            return (
              <SquareTile
                key={topic.id}
                href={hrefFor(topic)}
                icon={theme.icon}
                name={topic.name}
                bg={theme.bg}
                accent={theme.accent}
              />
            );
          }),
        ];

        return (
          <div key={t.type} className="mb-8 flex flex-col">
            <div className="grid grid-cols-2 gap-3">{tiles}</div>

            <div className="mt-8 flex flex-col gap-3">
              <WideTile
                href={`/tasks/practice?type=${t.type}&section=${params.id}`}
                title="⚡ Daily Mix"
                subtitle="10 random cards"
                bg={FIX_MISTAKES_THEME.bg}
                accent={FIX_MISTAKES_THEME.accent}
              />
              <WideTile
                href="/tasks/free-flow"
                title={`${freeFlowTheme.icon} Free Flow`}
                bg={freeFlowTheme.bg}
                accent={freeFlowTheme.accent}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const FIX_MISTAKES = "Fix Mistakes";

/** The 2-column square grid, row by row; each row is painted in one topic's colors. */
const GRID_ROWS = [
  { items: ["Dependent", "Essential"], colorOf: "Dependent" },
  { items: ["Fixed Expressions", "Phrasal Verbs"], colorOf: "Essential" },
  { items: [ACADEMIC_TOPIC_NAME, FIX_MISTAKES], colorOf: ACADEMIC_TOPIC_NAME },
];

/** A square topic button: icon on top, then the name one word per line, centered. */
function SquareTile({
  href,
  icon,
  name,
  subtitle,
  bg,
  accent,
}: {
  href: string;
  icon: string;
  name: string;
  subtitle?: string;
  bg: string;
  accent: string;
}) {
  return (
    <Link href={href}>
      <div
        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center transition-transform hover:scale-[1.02]"
        style={{ background: bg, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      >
        <div className="text-4xl leading-none">{icon}</div>
        <div className="text-lg font-bold leading-tight" style={{ color: accent }}>
          {name.split(" ").map((word) => (
            <div key={word}>{word}</div>
          ))}
        </div>
        {subtitle && (
          <div className="text-xs opacity-70" style={{ color: accent }}>
            {subtitle}
          </div>
        )}
      </div>
    </Link>
  );
}

/** A full-width button below the grid: centered, larger title. */
function WideTile({
  href,
  title,
  subtitle,
  bg,
  accent,
}: {
  href: string;
  title: string;
  subtitle?: string;
  bg: string;
  accent: string;
}) {
  return (
    <Link href={href}>
      <div
        className="rounded-2xl p-5 text-center transition-transform hover:scale-[1.01]"
        style={{ background: bg, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      >
        <div className="text-2xl font-bold" style={{ color: accent }}>
          {title}
        </div>
        {subtitle && (
          <div className="text-sm opacity-70" style={{ color: accent }}>
            {subtitle}
          </div>
        )}
      </div>
    </Link>
  );
}
