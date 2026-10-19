import type { Metadata } from "next";
import { InfoPage } from "@/components/student/InfoPage";

export const metadata: Metadata = { title: "Privacy · Preposition Master" };

/** What the app keeps and where — keep in step with the code: progressSync (secret code),
 *  /api/reports (no name), DailyStat + Vercel Analytics, vercel.json region fra1. */
const POINTS: { title: string; text: React.ReactNode }[] = [
  {
    title: "On your phone",
    text: "Your nickname, points, titles and mistakes are kept in this browser on your phone. Only you see them.",
  },
  {
    title: "If you get a secret code",
    text: "Your points, mistakes and records are saved on our server under the code, so you can move them to another phone. Your nickname is not sent.",
  },
  {
    title: "Report a problem",
    text: "We get the sentence and your note — nothing about you. Please don't write your name or contacts there.",
  },
  {
    title: "Counting visits",
    text: "We count how many tests are finished each day (just a number) and use Vercel Web Analytics, which counts page visits without cookies.",
  },
  {
    title: "Where it's stored",
    text: "On servers in Frankfurt, Germany (EU). We never sell or share anything.",
  },
  {
    title: "Delete everything",
    text: (
      <>
        Menu → <b>My code</b> → <b>Delete my progress</b>. It&apos;s gone from your phone and our server at once.
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <InfoPage>
      <h1 className="mt-4 text-[26px] font-bold">Privacy</h1>
      <p className="mt-1.5 text-[13px] text-[#5C6378]">Updated 19 October 2026</p>

      <div className="mt-5 rounded-2xl px-4 py-3.5 text-[15px] leading-normal" style={{ background: "#E8F5EC", color: "#14532D" }}>
        <b>In short:</b> we don&apos;t know who you are. No accounts, no emails, no phone numbers, no real names. No
        ads.
      </div>

      <div className="mt-6 flex flex-col gap-4 text-[15px] leading-normal text-[#3D4A63]">
        {POINTS.map((p) => (
          <div key={p.title}>
            <h2 className="text-base font-bold text-[#2B2D42]">{p.title}</h2>
            <p>{p.text}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-[13px] text-[#5C6378]">
        Questions? Use <b>Report a problem</b> under any question.
      </p>
    </InfoPage>
  );
}
