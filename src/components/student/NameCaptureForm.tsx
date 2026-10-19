"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setStoredStudentName } from "@/lib/studentName";

/** The name field and the start button; the page around it provides the layout. */
export function NameCaptureForm() {
  const [name, setName] = useState("");
  const router = useRouter();
  const ready = name.trim() !== "";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setStoredStudentName(trimmed);
    router.push("/tasks");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between gap-6">
      <div className="menu-enter flex flex-col gap-2.5 pt-4" style={{ ["--i" as string]: 1 }}>
        <label htmlFor="name" className="text-base font-semibold" style={{ color: "#2B2D42" }}>
          Pick a nickname
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your nickname"
          autoComplete="off"
          autoFocus
          className="w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-base outline-none focus:border-[#1565C0]"
          style={{ borderColor: "#C9D6E6", color: "#2B2D42" }}
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        <button
          type="submit"
          disabled={!ready}
          className="menu-enter w-full py-3.5 text-base font-bold transition-[transform,opacity] active:scale-[0.97]"
          style={{
            background: "#1565C0",
            color: "#FFFFFF",
            borderRadius: "14px",
            opacity: ready ? 1 : 0.45,
            ["--i" as string]: 2,
          }}
        >
          Let&apos;s start
        </button>
        <Link
          href="/restore"
          className="menu-enter p-2 text-[15px] font-semibold"
          style={{ color: "#1565C0", ["--i" as string]: 3 }}
        >
          I already have a code
        </Link>
      </div>
    </form>
  );
}
