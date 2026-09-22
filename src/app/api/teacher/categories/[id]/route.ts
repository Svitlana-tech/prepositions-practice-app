import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Protected (middleware): rename a topic and/or move it to a different section.
 * A topic never moves between question types.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const data: { name?: string; sectionId?: string | null } = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Topic name is required" }, { status: 400 });
    }
    const clash = await prisma.category.findUnique({
      where: { taskType_name: { taskType: category.taskType, name } },
    });
    if (clash && clash.id !== id) {
      return NextResponse.json(
        { error: "This question type already has a topic with that name" },
        { status: 400 }
      );
    }
    data.name = name;
  }
  if (body?.sectionId !== undefined) {
    data.sectionId = typeof body.sectionId === "string" && body.sectionId ? body.sectionId : null;
  }

  const updated = await prisma.category.update({ where: { id }, data });
  return NextResponse.json({ category: updated });
}

/** Protected (middleware): delete a topic. Tasks using it just become uncategorized (see schema onDelete: SetNull). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
