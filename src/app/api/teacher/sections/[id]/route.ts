import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Protected (proxy): rename, reorder or publish/hide a section. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const section = await prisma.section.findUnique({ where: { id } });
  if (!section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const data: { name?: string; order?: number; isPublished?: boolean } = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Section name is required" }, { status: 400 });
    }
    const clash = await prisma.section.findUnique({ where: { name } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: "A section with that name already exists" }, { status: 400 });
    }
    data.name = name;
  }
  if (typeof body?.order === "number") {
    data.order = body.order;
  }
  if (typeof body?.isPublished === "boolean") {
    data.isPublished = body.isPublished;
  }

  const updated = await prisma.section.update({ where: { id }, data });
  return NextResponse.json({ section: updated });
}

/** Protected (proxy): delete a section. Topics/banks using it just become unsectioned (see schema onDelete: SetNull). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.section.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
