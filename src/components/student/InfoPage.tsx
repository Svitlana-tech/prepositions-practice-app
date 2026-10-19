import Link from "next/link";

/** The frame of the About and Privacy pages: a way back to the menu, then the content. */
export function InfoPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-5 pt-4 pb-10" style={{ color: "#2B2D42" }}>
      <Link href="/tasks" className="self-start py-2 text-[15px] font-semibold text-[#1565C0]">
        ← Back to menu
      </Link>
      {children}
    </div>
  );
}

/** Small grey capitals over each part of the page. */
export function InfoHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-7 mb-2 text-[13px] font-bold tracking-wider uppercase" style={{ color: "#5C6378" }}>
      {children}
    </h2>
  );
}

/** The "About · Privacy" links at the very bottom of the menu. */
export function InfoLinks() {
  return (
    <nav className="flex items-center justify-center gap-1.5 text-sm" style={{ color: "#5C6378" }}>
      <Link href="/about" className="px-2.5 py-3">
        About
      </Link>
      <span aria-hidden="true" style={{ color: "#C5CAD6" }}>
        ·
      </span>
      <Link href="/privacy" className="px-2.5 py-3">
        Privacy
      </Link>
    </nav>
  );
}
