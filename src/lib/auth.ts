export const TEACHER_COOKIE_NAME = "teacher_session";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The cookie value that proves the teacher password was entered correctly. */
export async function teacherSessionToken(): Promise<string> {
  const password = process.env.TEACHER_PASSWORD ?? "";
  return sha256Hex(password);
}

export function checkTeacherPassword(password: string): boolean {
  const expected = process.env.TEACHER_PASSWORD;
  return !!expected && password === expected;
}
