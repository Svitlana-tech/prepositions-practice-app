"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type BankSummary = {
  id: string;
  name: string;
  createdAt: string;
  wordCount: number;
  sectionId: string | null;
};

type Section = { id: string; name: string };

export default function VocabularyPage() {
  const [banks, setBanks] = useState<BankSummary[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSectionId, setNewSectionId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/teacher/vocab-banks").then((res) => res.json()),
      fetch("/api/teacher/sections").then((res) => res.json()),
    ])
      .then(([banksData, sectionsData]) => {
        setBanks(banksData.banks ?? []);
        setSections(sectionsData.sections ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/teacher/vocab-banks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), sectionId: newSectionId || undefined }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create the bank.");
      return;
    }
    setNewName("");
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/teacher/vocab-banks/${id}`, { method: "DELETE" });
    setConfirmingId(null);
    load();
  }

  async function handleSectionChange(bankId: string, sectionId: string) {
    setBanks((prev) => prev.map((b) => (b.id === bankId ? { ...b, sectionId: sectionId || null } : b)));
    await fetch(`/api/teacher/vocab-banks/${bankId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: sectionId || null }),
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Vocabulary</h1>
        <p className="text-sm text-gray-500">
          Word banks — one per level, one per student, however you want to split them. Each
          bank holds Ukrainian → English word pairs; future study and test modes will draw
          from a whole bank at a time.
        </p>
      </div>

      <Card className="mb-6">
        <div className="mb-2 text-sm font-medium text-gray-700">New bank</div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. B1 or Ivan Petrenko"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select
            value={newSectionId}
            onChange={(e) => setNewSectionId(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">No section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? "Creating..." : "+ Create"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && banks.length === 0 && <p className="text-gray-500">No word banks yet.</p>}

      <div className="flex flex-col gap-3">
        {banks.map((b) => (
          <Card key={b.id} className="flex items-center justify-between gap-4">
            <Link href={`/teacher/vocabulary/${b.id}`} className="flex-1">
              <div className="text-lg font-medium text-gray-900 hover:text-blue-600">{b.name}</div>
              <div className="text-sm text-gray-500">
                {b.wordCount} word{b.wordCount === 1 ? "" : "s"} ·{" "}
                {new Date(b.createdAt).toLocaleDateString("en-GB")}
              </div>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={b.sectionId ?? ""}
                onChange={(e) => handleSectionChange(b.id, e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">No section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Link href={`/teacher/vocabulary/${b.id}`}>
                <Button variant="secondary">Open</Button>
              </Link>
              {confirmingId === b.id ? (
                <>
                  <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(b.id)}>
                    Really delete?
                  </Button>
                </>
              ) : (
                <Button variant="danger" onClick={() => setConfirmingId(b.id)}>
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
