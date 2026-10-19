"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createSecretCode, deleteMyProgress, skipCodeOffer } from "@/lib/progressSync";

/** The code wears Daily Mix's amber and the explanations' hand-printed blue. */
const AMBER = { bg: "#FEF3C7", border: "#F59E0B", accent: "#B45309", ink: "#92400E" };
const CODE_BLUE = "#1E4FA8";
const HANDWRITING = 'var(--font-handwriting), "Segoe Print", "Comic Sans MS", cursive';

/** The code written big, with a Copy button. */
function CodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the code is on screen to write down anyway.
    }
  }

  return (
    <div
      className="flex flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed bg-white px-3 py-4"
      style={{ borderColor: AMBER.border }}
    >
      <div className="text-[30px] leading-none tracking-wide select-all" style={{ color: CODE_BLUE, fontFamily: HANDWRITING }}>
        {code}
      </div>
      <button
        type="button"
        onClick={copy}
        className="rounded-xl border-[1.5px] border-[#C9D6E6] bg-white px-4 py-2 text-sm font-semibold text-[#1565C0]"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}

/**
 * The results-screen card (variant "2B", her pick 2026-10-19): offers a secret code to keep the
 * points; after "Get my code" the same card shows the code and how to keep it.
 */
export function CodeOffer({ totalPoints }: { totalPoints: number }) {
  const [hidden, setHidden] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hidden) return null;

  async function getCode() {
    setBusy(true);
    setError(null);
    try {
      setCode(await createSecretCode());
    } catch {
      setError("Could not get a code. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="record-pop flex flex-col gap-3 rounded-[18px] p-4" style={{ background: AMBER.bg }}>
      {code ? (
        <>
          <div className="text-center text-lg font-bold" style={{ color: AMBER.ink }}>
            🔑 Your secret code
          </div>
          <CodeBox code={code} />
          <p className="text-sm leading-snug" style={{ color: AMBER.ink }}>
            Take a screenshot or write it down. On a new phone, tap “I already have a code” — your
            points come back. Don&apos;t share it, it&apos;s only yours.
          </p>
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="rounded-xl py-3 text-base font-bold text-white"
            style={{ background: AMBER.accent }}
          >
            I saved it
          </button>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-white text-xl">🔑</div>
            <div>
              <div className="text-[17px] font-bold" style={{ color: AMBER.ink }}>
                Keep your {totalPoints} points forever
              </div>
              <div className="text-sm leading-snug" style={{ color: AMBER.ink }}>
                Get a secret code. With it, your points and mistakes move to any phone.
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={getCode}
              disabled={busy}
              className="flex-1 rounded-xl py-3 text-base font-bold text-white disabled:opacity-60"
              style={{ background: AMBER.accent }}
            >
              {busy ? "One moment…" : "Get my code"}
            </button>
            <button
              type="button"
              onClick={() => {
                skipCodeOffer();
                setHidden(true);
              }}
              className="rounded-xl px-3.5 py-3 text-base font-semibold"
              style={{ color: AMBER.ink }}
            >
              Not now
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The menu's "My code" sheet: the code (or a way to get one), switching player (the old
 * "Not me") and deleting the student's progress, with a second tap to confirm.
 */
export function MyCodeSheet({
  code,
  onCode,
  onSwitchPlayer,
  onDeleted,
  onClose,
}: {
  code: string | null;
  onCode: (code: string) => void;
  onSwitchPlayer: () => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getCode() {
    setBusy(true);
    setError(null);
    try {
      onCode(await createSecretCode());
    } catch {
      setError("Could not get a code. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await deleteMyProgress();
      onDeleted();
    } catch {
      setError("Could not delete. Check your internet and try again.");
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 touch-auto" role="dialog" aria-modal="true" aria-label="My code">
      <div className="absolute inset-0 bg-gray-900/35" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col gap-3 rounded-t-3xl bg-white px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        style={{ boxShadow: "0 -6px 24px rgba(0,0,0,0.12)" }}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-gray-200" />
        <h3 className="text-lg font-bold text-gray-900">Your secret code</h3>
        {code ? (
          <>
            <CodeBox code={code} />
            <p className="text-sm text-gray-500">
              Your progress is saved with this code. On a new phone, tap “I already have a code”.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              You don&apos;t have a code yet. Get one to keep your points if you change your phone.
            </p>
            <button
              type="button"
              onClick={getCode}
              disabled={busy}
              className="rounded-xl py-3 text-base font-bold text-white disabled:opacity-60"
              style={{ background: AMBER.accent }}
            >
              {busy ? "One moment…" : "Get my code"}
            </button>
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="h-px bg-gray-100" />
        <button type="button" onClick={onSwitchPlayer} className="py-1.5 text-left text-[15px] font-semibold text-[#1565C0]">
          Switch player (not me)
        </button>
        {confirmDelete ? (
          <div className="flex flex-col gap-2 rounded-xl bg-red-50 p-3">
            <p className="text-sm text-red-800">
              All your points, titles and mistakes will be gone{code ? " — on every phone" : ""}. Sure?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl bg-white py-2.5 text-sm font-semibold text-gray-700"
              >
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="py-1.5 text-left text-[15px] font-semibold text-red-700"
          >
            Delete my progress
          </button>
        )}
        <button type="button" onClick={onClose} className="text-sm text-gray-500">
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}
