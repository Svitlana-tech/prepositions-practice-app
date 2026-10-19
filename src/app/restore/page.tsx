"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setStoredStudentName } from "@/lib/studentName";
import { setOnboardingSeen } from "@/lib/onboarding";
import { adoptSave, findSave, type SavedProgress } from "@/lib/progressSync";

const INPUT =
  "w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-base outline-none focus:border-[#1565C0]";

/** "I already have a code": type the secret code, then a nickname, and the progress is back. */
export default function RestorePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [found, setFound] = useState<SavedProgress | null>(null);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFind(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await findSave(code);
      if (saved) setFound(saved);
      else setError("We couldn't find this code. Check the words and the number.");
    } catch {
      setError("No connection. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleStart(e: FormEvent) {
    e.preventDefault();
    const name = nickname.trim();
    if (!name || !found) return;
    setStoredStudentName(name);
    setOnboardingSeen();
    adoptSave(code, found);
    router.push("/tasks");
  }

  const points = typeof found?.values.points === "number" ? found.values.points : 0;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-5 pt-6 pb-8" style={{ color: "#2B2D42" }}>
      <Link href="/" className="self-start py-2 text-[15px] font-semibold text-[#1565C0]">
        ← Back
      </Link>
      <h1 className="mt-10 text-[26px] font-bold">Welcome back!</h1>
      <p className="mt-2 text-base text-gray-500">
        Type your secret code to bring back your points, titles and mistakes.
      </p>

      {!found ? (
        <form onSubmit={handleFind} className="mt-8 flex flex-1 flex-col justify-between gap-6">
          <div className="flex flex-col gap-2.5">
            <label htmlFor="code" className="text-base font-semibold">
              Secret code
            </label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="BLUE-TIGER-4821"
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              className={`${INPUT} text-lg font-semibold tracking-wide uppercase`}
              style={{ borderColor: "#C9D6E6" }}
            />
            <p className="text-[13px] text-gray-500">Small or capital letters — both are fine.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={!code.trim() || busy}
              className="w-full rounded-[14px] py-3.5 text-base font-bold text-white transition-opacity disabled:opacity-45"
              style={{ background: "#1565C0" }}
            >
              {busy ? "Looking…" : "Find my progress"}
            </button>
            <p className="text-center text-[13px] text-gray-500">
              Lost your code? Sadly we can&apos;t find it — we don&apos;t know who you are. That keeps you safe.
            </p>
          </div>
        </form>
      ) : (
        <form onSubmit={handleStart} className="mt-8 flex flex-1 flex-col justify-between gap-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5 rounded-[14px] px-4 py-3.5" style={{ background: "#E8F5EC", color: "#14532D" }}>
              <span className="text-lg">✓</span>
              <span className="text-[15px]">
                <b>Found!</b> {points} points
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              <label htmlFor="nickname" className="text-base font-semibold">
                Pick a nickname
              </label>
              <input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your nickname"
                autoComplete="off"
                autoFocus
                className={INPUT}
                style={{ borderColor: "#C9D6E6" }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!nickname.trim()}
            className="w-full rounded-[14px] py-3.5 text-base font-bold text-white transition-opacity disabled:opacity-45"
            style={{ background: "#1565C0" }}
          >
            Bring back my progress
          </button>
        </form>
      )}
    </div>
  );
}
