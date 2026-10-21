import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isRateLimited, tooManyTries } from "@/lib/rateLimit";
import { generateSecretCode, hashSecretCode } from "@/lib/secretCode";
import { parseSavedProgress, toJson } from "@/lib/progressSave";

/** Public: gives the student a new secret code and saves their progress under it. Only the
 *  code's hash is kept, so the code is shown once here and never again by the server. */
export async function POST(request: NextRequest) {
  if (await isRateLimited(request, "progressCreate")) return tooManyTries();
  const body = await request.json().catch(() => null);
  const data = parseSavedProgress(body?.data);
  if (!data) {
    return NextResponse.json({ error: "Bad progress" }, { status: 400 });
  }

  // A clash with an existing code is very unlikely; a few retries make it practically impossible.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSecretCode();
    const codeHash = hashSecretCode(code)!;
    const taken = await prisma.progressSave.findUnique({ where: { codeHash }, select: { codeHash: true } });
    if (taken) continue;
    await prisma.progressSave.create({ data: { codeHash, data: toJson(data) } });
    return NextResponse.json({ code }, { status: 201 });
  }
  return NextResponse.json({ error: "Try again" }, { status: 503 });
}
