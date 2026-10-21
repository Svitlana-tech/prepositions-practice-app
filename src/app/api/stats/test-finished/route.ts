import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { kyivDay } from "@/lib/usageDay";
import { isRateLimited, tooManyTries } from "@/lib/rateLimit";

/** Public: +1 to today's count of finished tests. Anonymous — nothing about the student is
 *  sent or stored, only the number for the teacher's Usage page. */
export async function POST(request: NextRequest) {
  if (await isRateLimited(request, "testFinished")) return tooManyTries();
  const day = kyivDay();
  await prisma.dailyStat.upsert({
    where: { day },
    create: { day, testsFinished: 1 },
    update: { testsFinished: { increment: 1 } },
  });
  return NextResponse.json({ ok: true });
}
