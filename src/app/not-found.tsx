import type { Metadata } from "next";
import { StatusScreen } from "@/components/student/StatusScreen";

export const metadata: Metadata = { title: "Page not found · Preposition Master" };

/** A wrong or old link (her pick "A", 2026-10-21). No "your points are safe" here — a wrong
 *  address can't touch them, so the line would only puzzle (her point). */
export default function NotFound() {
  return (
    <StatusScreen cards={["4", "0", "4"]} title="This page got lost">
      We couldn&apos;t find it.
      <br />
      Maybe the link is old or has a typo.
    </StatusScreen>
  );
}
