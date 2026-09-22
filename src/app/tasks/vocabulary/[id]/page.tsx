"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredStudentName } from "@/lib/studentName";
import { Card } from "@/components/ui/Card";

type Bank = { id: string; name: string; words: { id: string }[] };

/** The exercise types a word bank can be practiced with. Lexical Battle isn't built yet. */
export default function VocabularyBankPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [bank, setBank] = useState<Bank | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const name = getStoredStudentName();
    if (!name) {
      router.replace("/");
      return;
    }
    setStudentName(name);
    fetch(`/api/vocab-banks/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setBank(data.bank))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [router, params.id]);

  if (!studentName) return null;
  if (notFound)
    return (
      <p className="mx-auto max-w-2xl px-6 py-10 text-red-600 md:max-w-3xl lg:max-w-4xl">
        Bank not found.
      </p>
    );
  if (loading || !bank)
    return (
      <p className="mx-auto max-w-2xl px-6 py-10 text-gray-500 md:max-w-3xl lg:max-w-4xl">
        Loading...
      </p>
    );

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:max-w-3xl lg:max-w-4xl">
      <Link href="/tasks/vocabulary" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to Vocabulary
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">{bank.name}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {bank.words.length} word{bank.words.length === 1 ? "" : "s"} · choose how to practice
      </p>

      <div className="flex flex-col gap-3">
        <Link href={`/tasks/vocabulary/${bank.id}/flashcards`}>
          <Card className="transition-shadow hover:shadow-md">
            <div className="text-lg font-medium text-gray-900">🗂️ Flashcards</div>
            <div className="text-sm text-gray-500">See the word, then flip it to check the translation</div>
          </Card>
        </Link>

        <Link href={`/tasks/vocabulary/${bank.id}/written`}>
          <Card className="transition-shadow hover:shadow-md">
            <div className="text-lg font-medium text-gray-900">✏️ Written practice</div>
            <div className="text-sm text-gray-500">Type the English word and check it</div>
          </Card>
        </Link>

        <Card className="opacity-60">
          <div className="text-lg font-medium text-gray-900">⚔️ Lexical Battle</div>
          <div className="text-sm text-gray-500">Coming soon</div>
        </Card>
      </div>
    </div>
  );
}
