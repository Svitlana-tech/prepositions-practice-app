"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredStudentName } from "@/lib/studentName";
import { Card } from "@/components/ui/Card";

type BankSummary = { id: string; name: string; wordCount: number };

export default function VocabularyBanksPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [banks, setBanks] = useState<BankSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const name = getStoredStudentName();
    if (!name) {
      router.replace("/");
      return;
    }
    setStudentName(name);
    fetch("/api/vocab-banks")
      .then((res) => res.json())
      .then((data) => setBanks(data.banks ?? []))
      .finally(() => setLoading(false));
  }, [router]);

  if (!studentName) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
      <Link href="/tasks" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to exercises
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Vocabulary</h1>

      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && banks.length === 0 && <p className="text-gray-500">No word banks yet.</p>}

      <div className="flex flex-col gap-3">
        {banks.map((b) => (
          <Link key={b.id} href={`/tasks/vocabulary/${b.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="text-lg font-medium text-gray-900">{b.name}</div>
              <div className="text-sm text-gray-500">
                {b.wordCount} word{b.wordCount === 1 ? "" : "s"}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
