"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { clearStoredStudentName, getStoredStudentName } from "@/lib/studentName";
import { FIX_MISTAKES_THEME, getCategoryTheme } from "@/lib/categoryTheme";
import { ACADEMIC_TOPIC_NAME, FREE_FLOW_TOPIC_NAMES, TOPIC_GROUPS } from "@/lib/topics";
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
    <div className="mx-auto max-w-2xl px-6 pt-6 pb-40 md:max-w-3xl lg:max-w-4xl">
      {multipleSections && (
        <Link href="/tasks" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to sections
        </Link>
      )}
      <div className="mb-4 flex items-center justify-between">
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
        const everyday = TOPIC_GROUPS[EVERYDAY_GROUP];
        const everydayTheme = getCategoryTheme("Essential");
        const hasEveryday = everyday.topics.some((name) => byName.has(name));
        const phrasal = byName.get("Phrasal Verbs");
        const academic = byName.get(ACADEMIC_TOPIC_NAME);
        const freeFlowTheme = getCategoryTheme(FREE_FLOW_TOPIC_NAMES[0]);
        const placed = new Set([...everyday.topics, "Phrasal Verbs", ACADEMIC_TOPIC_NAME]);
        // Topics added later that the layout doesn't know yet still get a tile, after Academic.
        const extras = t.topics.filter((topic) => !placed.has(topic.name));

        return (
          <div key={t.type} className="mb-8 flex flex-col gap-6">
            <WideTile
              href={`/tasks/practice?type=${t.type}&section=${params.id}`}
              title="⚡ Daily Mix"
              subtitle="10 random cards for today's drill"
              bg={FIX_MISTAKES_THEME.bg}
              accent={FIX_MISTAKES_THEME.accent}
            />

            <div className="grid grid-cols-2 gap-3">
              {hasEveryday && (
                <TopicTile
                  href={`/tasks/practice?type=${t.type}&group=${EVERYDAY_GROUP}&section=${params.id}`}
                  icon={everydayTheme.icon}
                  name={everyday.name}
                  height={TALL_TILE_HEIGHT}
                  bg={everydayTheme.bg}
                  accent={everydayTheme.accent}
                />
              )}
              {phrasal && (
                <TopicTile
                  href={hrefFor(phrasal)}
                  icon={getCategoryTheme(phrasal.name).icon}
                  name={phrasal.name}
                  height={TALL_TILE_HEIGHT}
                  bg={everydayTheme.bg}
                  accent={everydayTheme.accent}
                />
              )}
              {academic && (
                <TopicTile
                  href={hrefFor(academic)}
                  name={academic.name}
                  wide
                  {...getCategoryTheme(academic.name)}
                />
              )}
              {extras.map((topic) => (
                <TopicTile key={topic.id} href={hrefFor(topic)} name={topic.name} {...getCategoryTheme(topic.name)} />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TopicTile
                href="/tasks/mistakes"
                icon={FIX_MISTAKES_THEME.icon}
                name="Fix Mistakes"
                count={mistakeCount || undefined}
                bg={getCategoryTheme(ACADEMIC_TOPIC_NAME).bg}
                accent={getCategoryTheme(ACADEMIC_TOPIC_NAME).accent}
              />
              <TopicTile href="/tasks/free-flow" name={FREE_FLOW_TOPIC_NAMES[0]} {...freeFlowTheme} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The TOPIC_GROUPS key behind the Everyday Prepositions button. */
const EVERYDAY_GROUP = "everyday";

/** Most buttons on this screen are this tall — just enough for the icon and a two-line
 *  name, so the whole menu fits on one phone screen. */
const TILE_HEIGHT = "h-24";
/** Everyday Prepositions and Phrasal Verbs stand out a little taller. */
const TALL_TILE_HEIGHT = "h-28";

/** A topic button, two to a row: icon on top, then the name one word per line, centered.
 *  `wide` spans both columns with the name on one line. `count` is shown in brackets
 *  after the name, e.g. "Mistakes (3)". */
function TopicTile({
  href,
  icon,
  name,
  count,
  wide = false,
  height = TILE_HEIGHT,
  bg,
  accent,
}: {
  href: string;
  icon: string;
  name: string;
  count?: number;
  wide?: boolean;
  height?: string;
  bg: string;
  accent: string;
}) {
  const words = wide ? [name] : name.split(" ");
  return (
    <Link href={href} className={wide ? "col-span-2" : undefined}>
      <div
        className={`flex ${height} flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-center transition-transform hover:scale-[1.02]`}
        style={{ background: bg, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      >
        <div className="text-4xl leading-none">{icon}</div>
        <div className="text-lg font-bold leading-tight" style={{ color: accent }}>
          {words.map((word, i) => (
            <div key={word}>
              {word}
              {count !== undefined && i === words.length - 1 && ` (${count})`}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

/** A full-width button (Daily Mix): centered, larger title. */
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
        className={`flex ${TILE_HEIGHT} flex-col items-center justify-center rounded-2xl px-5 text-center transition-transform hover:scale-[1.01]`}
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
