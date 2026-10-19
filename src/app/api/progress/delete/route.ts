import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashSecretCode } from "@/lib/secretCode";

/** Public: "Delete my progress" — removes everything saved under a secret code. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const codeHash = typeof body?.code === "string" ? hashSecretCode(body.code) : null;
  if (!codeHash) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  await prisma.progressSave.deleteMany({ where: { codeHash } });
  return NextResponse.json({ ok: true });
}
