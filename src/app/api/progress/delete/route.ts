import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { countWrongCode, isOverLimit, isRateLimited, tooManyTries } from "@/lib/rateLimit";
import { hashSecretCode } from "@/lib/secretCode";

/** Public: "Delete my progress" — removes everything saved under a secret code. */
export async function POST(request: NextRequest) {
  if ((await isRateLimited(request, "progressDelete")) || (await isOverLimit(request, "progressWrongCode"))) {
    return tooManyTries();
  }
  const body = await request.json().catch(() => null);
  const codeHash = typeof body?.code === "string" ? hashSecretCode(body.code) : null;
  if (!codeHash) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { count } = await prisma.progressSave.deleteMany({ where: { codeHash } });
  if (count === 0) await countWrongCode(request);
  return NextResponse.json({ ok: true });
}
