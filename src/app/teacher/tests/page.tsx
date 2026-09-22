"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type TestSummary = {
  id: string;
  title: string;
  mode: "SELF_CHECK" | "TEACHER_REVIEW";
  createdAt: string;
  questionCount: number;
};

export default function TestsPage() {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/teacher/tests")
      .then((res) => res.json())
      .then((data) => setTests(data.tests ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id: string) {
    await fetch(`/api/teacher/tests/${id}`, { method: "DELETE" });
    setConfirmingId(null);
    load();
  }

  function shareUrl(id: string) {
    return `${window.location.origin}/t/${id}`;
  }

  function handleCopy(id: string) {
    navigator.clipboard.writeText(shareUrl(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tests</h1>
          <p className="text-sm text-gray-500">
            A fixed set of questions with one link — every student who opens it gets the same test.
          </p>
        </div>
        <Link href="/teacher/tests/new">
          <Button>+ New Test</Button>
        </Link>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && tests.length === 0 && <p className="text-gray-500">No tests yet.</p>}

      <div className="flex flex-col gap-3">
        {tests.map((t) => (
          <Card key={t.id} className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-lg font-medium text-gray-900">{t.title}</div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {t.mode === "SELF_CHECK" ? "Self-check" : "Sent to teacher"}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {t.questionCount} question{t.questionCount === 1 ? "" : "s"} ·{" "}
                {new Date(t.createdAt).toLocaleDateString("en-GB")}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => handleCopy(t.id)}>
                {copiedId === t.id ? "Copied!" : "Copy link"}
              </Button>
              <Link href={`/teacher/tests/${t.id}/results`}>
                <Button variant="secondary">Results</Button>
              </Link>
              <Link href={`/teacher/tests/${t.id}/edit`}>
                <Button variant="secondary">Edit</Button>
              </Link>
              {confirmingId === t.id ? (
                <>
                  <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(t.id)}>
                    Really delete?
                  </Button>
                </>
              ) : (
                <Button variant="danger" onClick={() => setConfirmingId(t.id)}>
                  Delete
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
