"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getStoredStudentName } from "@/lib/studentName";

const THANKS_MS = 2500;

/**
 * The small grey "Report a problem" link under a question (her pick "B", 2026-10-07): it
 * opens a bottom sheet with one text box; the note lands on the teacher's Reports page.
 * Deliberately quiet — small, grey, at the very bottom — so it doesn't pull attention
 * away from the question.
 */
export function ReportProblem({ taskId, chosen }: { taskId: string; chosen?: string | null }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  // A new question starts fresh.
  useEffect(() => {
    setOpen(false);
    setText("");
    setError(null);
    setThanks(false);
  }, [taskId]);

  useEffect(() => {
    if (!thanks) return;
    const timer = window.setTimeout(() => setThanks(false), THANKS_MS);
    return () => window.clearTimeout(timer);
  }, [thanks]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          chosen: chosen ?? null,
          comment: text.trim(),
          studentName: getStoredStudentName(),
        }),
      });
      if (!res.ok) throw new Error();
      setOpen(false);
      setText("");
      setThanks(true);
    } catch {
      setError("Could not send. Check your internet and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex h-6 items-center justify-center">
        {thanks ? (
          <span className="text-base text-[#1E4FA8]" style={{ fontFamily: "var(--font-handwriting)" }}>
            Thanks! We&apos;ll check it.
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-gray-400 underline underline-offset-2"
          >
            Report a problem
          </button>
        )}
      </div>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 touch-auto" role="dialog" aria-modal="true" aria-label="Report a problem">
            <div className="absolute inset-0 bg-gray-900/35" onClick={() => setOpen(false)} />
            <div
              className="absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col gap-3 rounded-t-3xl bg-white px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
              style={{ boxShadow: "0 -6px 24px rgba(0,0,0,0.12)" }}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-gray-200" />
              <h3 className="text-lg font-bold text-gray-900">Report a problem</h3>
              <p className="text-sm text-gray-500">What&apos;s wrong with this question?</p>
              <textarea
                autoFocus
                rows={4}
                maxLength={1000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type here…"
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-base text-gray-900 outline-none focus:border-[#1565C0]"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={send}
                disabled={!text.trim() || sending}
                className="w-full rounded-2xl bg-[#1565C0] py-3 text-base font-bold text-white transition-opacity disabled:opacity-40"
              >
                {sending ? "Sending…" : "Send"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500">
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
