"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { clearStoredStudentName, getStoredStudentName } from "@/lib/studentName";
import { FIX_MISTAKES_THEME, getCategoryTheme } from "@/lib/categoryTheme";
import { ACADEMIC_TOPIC_NAME, TOPIC_GROUPS } from "@/lib/topics";
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

  // Narrow side padding: the buttons run almost edge to edge, a couple of millimetres
  // clear on each side. Tall bottom padding: phone browsers (Telegram, iOS Safari) float
  // their toolbar over the page bottom, so the last button needs room to scroll up clear of it.
  return (
    <div className="mx-auto w-full max-w-2xl px-2.5 pt-4 pb-40 md:max-w-3xl lg:max-w-4xl">
      {multipleSections && (
        <Link href="/tasks" className="mb-4 inline-block px-1 text-sm text-blue-600 hover:underline">
          ← Back to sections
        </Link>
      )}
      <div className="mb-4 flex items-center justify-between px-1">
        <h1 className="text-2xl font-semibold text-gray-900">Hi, {studentName}!</h1>
        <button onClick={handleNotYou} className="text-sm text-blue-600 hover:underline">
          Not me
        </button>
      </div>

      {loading && <p className="px-1 text-gray-500">Loading...</p>}
      {isEmpty && <p className="px-1 text-gray-500">Nothing here yet — check back later.</p>}

      {types.map((t) => {
        const byName = new Map(t.topics.map((topic) => [topic.name, topic]));
        const hrefFor = (topic: TopicSummary) =>
          `/tasks/practice?type=${t.type}&topic=${topic.id}&section=${params.id}`;
        const everyday = TOPIC_GROUPS[EVERYDAY_GROUP];
        const hasEveryday = everyday.topics.some((name) => byName.has(name));
        const phrasal = byName.get("Phrasal Verbs");
        const academic = byName.get(ACADEMIC_TOPIC_NAME);
        const placed = new Set([...everyday.topics, "Phrasal Verbs", ACADEMIC_TOPIC_NAME]);
        // Topics added later that the layout doesn't know yet still get a tile, after Academic.
        const extras = t.topics.filter((topic) => !placed.has(topic.name));
        const mistakesTheme = getCategoryTheme(ACADEMIC_TOPIC_NAME);

        return (
          <div key={t.type} className="mb-8 flex flex-col">
            <Link href={`/tasks/practice?type=${t.type}&section=${params.id}`}>
              <div
                className="flex h-[76px] flex-col items-center justify-center rounded-2xl px-3 text-center transition-transform hover:scale-[1.01]"
                style={{ background: DAILY_MIX_THEME.bg, boxShadow: TILE_SHADOW }}
              >
                <div className="text-2xl font-bold leading-tight" style={{ color: DAILY_MIX_THEME.accent }}>
                  ⚡ Daily Mix
                </div>
                <div className="text-sm opacity-80" style={{ color: DAILY_MIX_THEME.accent }}>
                  10 random cards for today&apos;s drill
                </div>
              </div>
            </Link>

            <div className="grid grid-cols-2 gap-3" style={{ marginTop: GROUP_GAP }}>
              {hasEveryday && (
                <TopicTile
                  href={`/tasks/practice?type=${t.type}&group=${EVERYDAY_GROUP}&section=${params.id}`}
                  icon={getCategoryTheme("Essential").icon}
                  lines={everyday.name.split(" ")}
                  {...TOPICS_THEME}
                />
              )}
              {phrasal && (
                <TopicTile
                  href={hrefFor(phrasal)}
                  icon={getCategoryTheme(phrasal.name).icon}
                  lines={phrasal.name.split(" ")}
                  {...TOPICS_THEME}
                />
              )}
              {academic && (
                <TopicTile
                  href={hrefFor(academic)}
                  icon={getCategoryTheme(academic.name).icon}
                  lines={["Academic & Exams", "IELTS / Formal Writing"]}
                  wide
                  {...TOPICS_THEME}
                />
              )}
              {extras.map((topic) => (
                <TopicTile
                  key={topic.id}
                  href={hrefFor(topic)}
                  icon={getCategoryTheme(topic.name).icon}
                  lines={topic.name.split(" ")}
                  {...TOPICS_THEME}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3" style={{ marginTop: GROUP_GAP }}>
              <TopicTile
                href="/tasks/mistakes"
                icon={FIX_MISTAKES_THEME.icon}
                lines={["Fix", mistakeCount ? `Mistakes (${mistakeCount})` : "Mistakes"]}
                bg={mistakesTheme.bg}
                accent={mistakesTheme.accent}
              />
              <TopicTile href="/tasks/free-flow" icon="☕" lines={["Relaxed", "Practice"]} {...RELAXED_THEME} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The TOPIC_GROUPS key behind the Everyday Prepositions button. */
const EVERYDAY_GROUP = "everyday";

const DAILY_MIX_THEME = { bg: "#FEF3C7", accent: "#D97706" }; // warm amber on sand
/** Everyday Prepositions, Phrasal Verbs and Academic all share one blue. */
const TOPICS_THEME = { bg: "#E3F2FD", accent: "#1565C0" };
/** Relaxed Practice (the Free Flow deck): calm sage. */
const RELAXED_THEME = { bg: "#ECFDF5", accent: "#047857" };

const TILE_SHADOW = "0 4px 12px rgba(0,0,0,0.05)";
/** About 1.5 cm between the three groups — less on short screens, so the whole menu
 *  still fits on one phone screen. */
const GROUP_GAP = "min(80px, 8dvh)";

/** A menu button: its name in lines, centered, with the icon in front of the first line.
 *  `wide` spans both columns and is a little lower. */
function TopicTile({
  href,
  icon,
  lines,
  wide = false,
  bg,
  accent,
}: {
  href: string;
  icon: string;
  lines: string[];
  wide?: boolean;
  bg: string;
  accent: string;
}) {
  return (
    <Link href={href} className={wide ? "col-span-2" : undefined}>
      <div
        className={`flex ${wide ? "h-24" : "h-28"} flex-col items-center justify-center rounded-2xl px-2 py-1 text-center transition-transform hover:scale-[1.02]`}
        style={{ background: bg, boxShadow: TILE_SHADOW }}
      >
        <div className="text-lg font-bold leading-tight" style={{ color: accent }}>
          {lines.map((line, i) => (
            <div key={line}>
              {i === 0 && <span className="mr-1.5 text-2xl align-middle">{icon}</span>}
              {line}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
