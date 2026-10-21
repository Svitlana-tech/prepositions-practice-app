import Link from "next/link";

/** The 404 and "Something went wrong" screens (her picks 2026-10-21): three fanned cards,
 *  a title and a line of text in the middle, buttons at the bottom — like public/offline.html. */
export function StatusScreen({
  cards,
  title,
  children,
  note,
  onRetry,
}: {
  cards: [string, string, string];
  title: string;
  children: React.ReactNode;
  /** The handwritten line under the text. */
  note?: string;
  /** Shows a "Try again" button above "Back to menu". */
  onRetry?: () => void;
}) {
  const tilt = ["rotate(-12deg) translateY(8px)", "none", "rotate(12deg) translateY(8px)"];
  const big = cards.every((c) => c.length === 1);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col items-center px-6 pb-10 text-center text-[#2B2D42]">
      <div className="grow" />
      <div aria-hidden="true" className="flex gap-2">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`flex h-[86px] w-16 items-center justify-center rounded-xl bg-white font-bold ${
              big ? "text-[34px] text-[#1565C0]" : "text-[22px] text-[#9AA8BD]"
            }`}
            style={{ boxShadow: "0 3px 10px rgba(21, 101, 192, 0.14)", transform: tilt[i] }}
          >
            {card}
          </div>
        ))}
      </div>
      <h1 className="mt-9 text-[26px] font-bold">{title}</h1>
      <p className="mt-2.5 text-base leading-normal text-[#5C6378]">{children}</p>
      {note && (
        <p className="mt-[18px] text-[19px] text-[#1E4FA8]" style={{ fontFamily: "var(--font-handwriting)" }}>
          {note}
        </p>
      )}
      <div className="grow" />
      <div className="flex w-full flex-col gap-2.5">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-[14px] bg-[#1565C0] p-[15px] text-base font-bold text-white"
          >
            Try again
          </button>
        )}
        <Link
          href="/tasks"
          className={`block w-full rounded-[14px] p-[15px] text-base font-bold ${
            onRetry ? "bg-[#FDF6EC] text-[#2B2D42] shadow-[inset_0_0_0_1px_#EADFCB]" : "bg-[#1565C0] text-white"
          }`}
        >
          Back to menu
        </Link>
      </div>
    </div>
  );
}
