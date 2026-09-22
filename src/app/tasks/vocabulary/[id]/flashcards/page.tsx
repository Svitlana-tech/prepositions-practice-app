"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredStudentName } from "@/lib/studentName";
import { VocabFlashcards } from "@/components/student/VocabFlashcards";

type Word = { id: string; ukrainian: string; answers: string[] };
type Bank = { id: string; name: string; words: Word[] };

export default function VocabFlashcardsPage() {
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
    <div className="mx-auto max-w-2xl px-2 py-6 md:max-w-3xl lg:max-w-4xl">
      <Link
        href={`/tasks/vocabulary/${bank.id}`}
        className="mb-4 inline-block px-1 text-sm text-blue-600 hover:underline"
      >
        ← Back to {bank.name}
      </Link>

      {bank.words.length === 0 ? (
        <p className="text-gray-500">This bank has no words yet.</p>
      ) : (
        <VocabFlashcards words={bank.words} />
      )}
    </div>
  );
}
