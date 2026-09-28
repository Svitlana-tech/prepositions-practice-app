"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { clearStoredStudentName, getStoredStudentName } from "@/lib/studentName";
import { FIX_MISTAKES_THEME, getCategoryTheme } from "@/lib/categoryTheme";
import { ACADEMIC_TOPIC_NAME, TOPIC_GROUPS } from "@/lib/topics";
import { getMistakeIds } from "@/lib/mistakes";
import { Spinner } from "@/components/ui/Spinner";

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

      {loading && <Spinner />}
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
        // Topics added later that the layout doesn't know yet still get a row, after Academic.
        const extras = t.topics.filter((topic) => !placed.has(topic.name));
        // Each button's place in the opening animation, top to bottom (Daily Mix is 0).
        let order = 0;
        const nextOrder = () => ++order;

        return (
          <div key={t.type} className="mb-8 flex flex-col">
            <Link
              href={`/tasks/practice?type=${t.type}&section=${params.id}`}
              className="menu-enter"
              style={{ "--i": 0 } as React.CSSProperties}
            >
              <div
                className="flex flex-col items-center rounded-2xl p-4 text-center transition-transform hover:scale-[1.01] active:scale-[0.97]"
                style={{ background: "#FEF3C7", color: "#B45309", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
              >
                <div className="text-2xl font-bold">
                  <span className="menu-bolt">⚡</span> Daily Mix
                </div>
                <div className="text-[13px] font-medium opacity-85">10 random cards for today&apos;s drill</div>
              </div>
            </Link>

            {/* Block 2: the topics, in blue. */}
            <div className="mt-9 flex flex-col gap-2">
              {hasEveryday && (
                <MenuRow
                  href={`/tasks/practice?type=${t.type}&group=${EVERYDAY_GROUP}&section=${params.id}`}
                  icon={getCategoryTheme("Essential").icon}
                  title={everyday.name}
                  hint="in, on, at, by…"
                  bg={TOPICS_BG}
                  order={nextOrder()}
                />
              )}
              {phrasal && (
                <MenuRow
                  href={hrefFor(phrasal)}
                  icon={getCategoryTheme(phrasal.name).icon}
                  title={phrasal.name}
                  hint="look after, give up…"
                  bg={TOPICS_BG}
                  order={nextOrder()}
                />
              )}
              {academic && (
                <MenuRow
                  href={hrefFor(academic)}
                  icon={getCategoryTheme(academic.name).icon}
                  title="Academic & Exams"
                  hint="IELTS / Formal Writing"
                  bg={TOPICS_BG}
                  order={nextOrder()}
                />
              )}
              {extras.map((topic) => (
                <MenuRow
                  key={topic.id}
                  href={hrefFor(topic)}
                  icon={getCategoryTheme(topic.name).icon}
                  title={topic.name}
                  bg={TOPICS_BG}
                  order={nextOrder()}
                />
              ))}
            </div>

            {/* Block 3: the practice modes, in warm sand. */}
            <div className="mt-11 flex flex-col gap-2">
              <MenuRow
                href="/tasks/mistakes"
                icon={FIX_MISTAKES_THEME.icon}
                title="Fix Mistakes"
                hint={
                  mistakeCount === 0
                    ? "No mistakes yet"
                    : `${mistakeCount} ${mistakeCount === 1 ? "sentence" : "sentences"} to try again`
                }
                bg={PRACTICE_BG}
                order={nextOrder()}
              />
              <MenuRow
                href="/tasks/free-flow"
                icon="☕"
                title="Relaxed Practice"
                hint="no score, at your own pace"
                bg={PRACTICE_BG}
                order={nextOrder()}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The TOPIC_GROUPS key behind the Everyday Prepositions button. */
const EVERYDAY_GROUP = "everyday";

/** Each block of rows has its own light background, so children tell them apart at a glance. */
const TOPICS_BG = "#E3F2FD";
const PRACTICE_BG = "#FDF6EC";

/** A full-width menu row: icon in a white circle, the name with a short grey hint under it,
 *  and an arrow on the right. */
function MenuRow({
  href,
  icon,
  title,
  hint,
  bg,
  order,
}: {
  href: string;
  icon: string;
  title: string;
  hint?: string;
  bg: string;
  /** Place in the menu's opening animation (see .menu-enter in globals.css). */
  order: number;
}) {
  return (
    <Link href={href} className="menu-enter" style={{ "--i": order } as React.CSSProperties}>
      <div
        className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-transform hover:scale-[1.01] active:scale-[0.97]"
        style={{ background: bg, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
      >
        <div className="grid h-[46px] w-[46px] flex-none place-items-center rounded-full bg-white text-2xl">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-gray-900">{title}</div>
          {hint && <div className="text-[12.5px] text-gray-500">{hint}</div>}
        </div>
        <span className="text-[22px] text-gray-400">›</span>
      </div>
    </Link>
  );
}
