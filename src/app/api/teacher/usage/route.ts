import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** The teacher's Usage page: finished tests per day, newest first. */
export async function GET() {
  const days = await prisma.dailyStat.findMany({ orderBy: { day: "desc" } });
  return NextResponse.json({ days });
}
