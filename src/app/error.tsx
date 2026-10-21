"use client";

import { StatusScreen } from "@/components/student/StatusScreen";

/** When a screen breaks (e.g. mid-test). Points live on the phone, so they really are safe. */
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <StatusScreen cards={["oo", "p", "s"]} title="Something went wrong" note="Your points are safe." onRetry={retry}>
      It&apos;s our fault, not yours.
      <br />
      Please try again in a moment.
    </StatusScreen>
  );
}
