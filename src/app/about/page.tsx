import type { Metadata } from "next";
import Link from "next/link";
import { InfoHeading, InfoPage } from "@/components/student/InfoPage";

export const metadata: Metadata = { title: "About · Preposition Master" };

/** Rounded down on purpose, so they stay true while content keeps growing. */
const FACTS = [
  { value: "1,490+", label: "sentences" },
  { value: "100+", label: "rules" },
  { value: "5", label: "topics" },
  { value: "B1–C1", label: "levels" },
];

const CARD = "grid h-[54px] w-10 place-items-center rounded-lg text-[15px] font-bold";

/** Who made the app and what's in it (her texts, 2026-10-19). Credits match CREDITS.md. */
export default function AboutPage() {
  return (
    <InfoPage>
      <div className="mt-4 flex flex-col items-center gap-2.5 text-center">
        <div className="flex gap-[5px]" aria-hidden="true">
          <div className={`${CARD} -rotate-[8deg] bg-white text-[#1565C0] shadow-[0_3px_10px_rgba(21,101,192,0.18)]`}>in</div>
          <div className={`${CARD} bg-[#1565C0] text-white`}>on</div>
          <div className={`${CARD} rotate-[8deg] bg-white text-[#1565C0] shadow-[0_3px_10px_rgba(21,101,192,0.18)]`}>at</div>
        </div>
        <h1 className="mt-1.5 text-[26px] font-bold">Preposition Master</h1>
        <p className="text-[15px] leading-snug text-[#5C6378]">
          Practise English prepositions
          <br />
          in 2 minutes a day.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 text-center">
        {FACTS.map((f) => (
          <div key={f.label} className="rounded-[14px] px-1 py-3" style={{ background: "#E3F2FD" }}>
            <div className="text-xl font-bold text-[#1565C0]">{f.value}</div>
            <div className="text-[12.5px] text-[#3D4A63]">{f.label}</div>
          </div>
        ))}
      </div>

      <InfoHeading>Made by</InfoHeading>
      <div className="flex flex-col gap-1.5 rounded-2xl p-4" style={{ background: "#FDF6EC" }}>
        <div className="text-[17px] font-bold">Svitlana Honcharova</div>
        <p className="text-[15px] leading-normal text-[#3D4A63]">
          English teacher with 25 years of experience at Lyceum No. 315 (Kyiv, Ukraine), specialising in working
          with senior students and preparing them for international exams. I help learners build confident English,
          achieve top exam scores and reach their academic goals.
        </p>
      </div>

      <InfoHeading>Found a mistake?</InfoHeading>
      <p className="text-[15px] leading-normal text-[#3D4A63]">
        Tap <b>Report a problem</b> under any question — we read every note.
      </p>

      <InfoHeading>Thanks to</InfoHeading>
      <div className="flex flex-col gap-1.5 text-sm leading-snug text-[#3D4A63]">
        <p>
          “Bad emoji” animation by Nemo Chen,{" "}
          <a href="https://lottiefiles.com/free-animation/bad-emoji-rinwzCiZVc" className="text-[#1565C0] underline">
            LottieFiles
          </a>
        </p>
        <p>
          Fonts Geist and Patrick Hand,{" "}
          <a href="https://fonts.google.com" className="text-[#1565C0] underline">
            Google Fonts
          </a>{" "}
          (SIL Open Font License)
        </p>
      </div>

      <div className="mt-10 flex justify-center gap-1.5 text-[13px] text-[#5C6378]">
        <span>© 2026</span>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className="text-[#1565C0]">
          Privacy
        </Link>
      </div>
    </InfoPage>
  );
}
