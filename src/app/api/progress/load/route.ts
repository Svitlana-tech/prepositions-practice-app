import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashSecretCode } from "@/lib/secretCode";

/** Public: the progress saved under a secret code. POST, so the code never sits in a URL. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const codeHash = typeof body?.code === "string" ? hashSecretCode(body.code) : null;
  const save = codeHash ? await prisma.progressSave.findUnique({ where: { codeHash } }) : null;
  if (!save) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }
  return NextResponse.json({ data: save.data });
}
