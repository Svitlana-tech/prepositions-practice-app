import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Protected (middleware): every student report, newest first. */
export async function GET() {
  const reports = await prisma.problemReport.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ reports });
}
