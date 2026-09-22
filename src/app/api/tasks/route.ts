import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Public: list published tasks (metadata only, no payload) for the student task list. */
export async function GET() {
  const tasks = await prisma.task.findMany({
    where: { isPublished: true },
    select: { id: true, type: true, title: true, instructions: true, points: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tasks });
}
