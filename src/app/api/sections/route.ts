import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Public: published sections, ordered, for the student "what do you want to practice?" menu. */
export async function GET() {
  const sections = await prisma.section.findMany({
    where: { isPublished: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });
  return NextResponse.json({ sections });
}
