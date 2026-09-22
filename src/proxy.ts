import { NextRequest, NextResponse } from "next/server";
import { TEACHER_COOKIE_NAME, teacherSessionToken } from "@/lib/auth";

export const config = {
  matcher: ["/teacher/:path*", "/api/teacher/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/teacher/login") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(TEACHER_COOKIE_NAME)?.value;
  const expected = await teacherSessionToken();

  if (cookie && cookie === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/teacher")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/teacher/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
