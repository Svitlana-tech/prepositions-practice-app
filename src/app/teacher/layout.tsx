"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/teacher/login") {
    return children;
  }

  async function handleLogout() {
    await fetch("/api/teacher-auth", { method: "DELETE" });
    router.push("/teacher/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/teacher" className="text-gray-900 hover:text-blue-600">
              Tasks
            </Link>
            <Link href="/teacher/categories" className="text-gray-900 hover:text-blue-600">
              Topics
            </Link>
            <Link href="/teacher/sections" className="text-gray-900 hover:text-blue-600">
              Sections
            </Link>
            <Link href="/teacher/vocabulary" className="text-gray-900 hover:text-blue-600">
              Vocabulary
            </Link>
            <Link href="/teacher/explanations" className="text-gray-900 hover:text-blue-600">
              Rule bank
            </Link>
            <Link href="/teacher/tests" className="text-gray-900 hover:text-blue-600">
              Tests
            </Link>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">
            Log out
          </button>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
