import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashSecretCode } from "@/lib/secretCode";
import { parseSavedProgress, toJson, type SavedProgress } from "@/lib/progressSave";

/** Public: replaces the progress saved under a secret code — unless the saved copy is newer
 *  (another phone wrote it later), then the newer one is kept and sent back. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const codeHash = typeof body?.code === "string" ? hashSecretCode(body.code) : null;
  const data = parseSavedProgress(body?.data);
  if (!codeHash || !data) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const save = await prisma.progressSave.findUnique({ where: { codeHash } });
  if (!save) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }
  const stored = save.data as unknown as SavedProgress;
  if (typeof stored?.updatedAt === "number" && stored.updatedAt > data.updatedAt) {
    return NextResponse.json({ data: stored, kept: "newer" });
  }
  await prisma.progressSave.update({ where: { codeHash }, data: { data: toJson(data) } });
  return NextResponse.json({ ok: true });
}
