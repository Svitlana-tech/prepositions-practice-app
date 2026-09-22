"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type Word = { id: string; ukrainian: string; answers: string[] };
type Bank = { id: string; name: string; words: Word[] };

export default function VocabBankPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [bank, setBank] = useState<Bank | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [ukrainian, setUkrainian] = useState("");
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const ukrainianRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUkrainian, setEditUkrainian] = useState("");
  const [editAnswer1, setEditAnswer1] = useState("");
  const [editAnswer2, setEditAnswer2] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteBank, setConfirmDeleteBank] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/teacher/vocab-banks/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        setBank(data.bank);
        setNameInput(data.bank.name);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [params.id]);

  async function handleRename() {
    if (!nameInput.trim()) return;
    await fetch(`/api/teacher/vocab-banks/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    setRenaming(false);
    load();
  }

  async function handleDeleteBank() {
    await fetch(`/api/teacher/vocab-banks/${params.id}`, { method: "DELETE" });
    router.push("/teacher/vocabulary");
  }

  async function handleAddWord() {
    setAddError(null);
    const answers = [answer1.trim(), answer2.trim()].filter(Boolean);
    if (!ukrainian.trim() || answers.length === 0) {
      setAddError("Add the Ukrainian word and at least one English answer.");
      return;
    }
    setAdding(true);
    const res = await fetch(`/api/teacher/vocab-banks/${params.id}/words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ukrainian: ukrainian.trim(), answers }),
    });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? "Could not add this word.");
      return;
    }
    setUkrainian("");
    setAnswer1("");
    setAnswer2("");
    ukrainianRef.current?.focus();
    load();
  }

  function startEdit(word: Word) {
    setEditingId(word.id);
    setEditUkrainian(word.ukrainian);
    setEditAnswer1(word.answers[0] ?? "");
    setEditAnswer2(word.answers[1] ?? "");
  }

  async function handleSaveEdit(id: string) {
    const answers = [editAnswer1.trim(), editAnswer2.trim()].filter(Boolean);
    if (!editUkrainian.trim() || answers.length === 0) return;
    await fetch(`/api/teacher/vocab-words/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ukrainian: editUkrainian.trim(), answers }),
    });
    setEditingId(null);
    load();
  }

  async function handleDeleteWord(id: string) {
    await fetch(`/api/teacher/vocab-words/${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    load();
  }

  if (notFound) return <p className="text-red-600">Bank not found.</p>;
  if (loading || !bank) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <Link href="/teacher/vocabulary" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to Vocabulary
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        {renaming ? (
          <div className="flex flex-1 gap-2">
            <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            <Button onClick={handleRename}>Save</Button>
            <Button variant="secondary" onClick={() => { setRenaming(false); setNameInput(bank.name); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">{bank.name}</h1>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setRenaming(true)}>
                Rename
              </Button>
              {confirmDeleteBank ? (
                <>
                  <Button variant="secondary" onClick={() => setConfirmDeleteBank(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={handleDeleteBank}>
                    Really delete bank?
                  </Button>
                </>
              ) : (
                <Button variant="danger" onClick={() => setConfirmDeleteBank(true)}>
                  Delete bank
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <Card className="mb-6">
        <div className="mb-2 text-sm font-medium text-gray-700">Add a word</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            ref={ukrainianRef}
            placeholder="Ukrainian"
            value={ukrainian}
            onChange={(e) => setUkrainian(e.target.value)}
          />
          <Input
            placeholder="English answer"
            value={answer1}
            onChange={(e) => setAnswer1(e.target.value)}
          />
          <Input
            placeholder="2nd answer (optional)"
            value={answer2}
            onChange={(e) => setAnswer2(e.target.value)}
          />
          <Button onClick={handleAddWord} disabled={adding}>
            {adding ? "Adding..." : "+ Add"}
          </Button>
        </div>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </Card>

      {bank.words.length === 0 && <p className="text-gray-500">No words in this bank yet.</p>}

      <div className="flex flex-col gap-2">
        {bank.words.map((w) => (
          <Card key={w.id}>
            {editingId === w.id ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={editUkrainian} onChange={(e) => setEditUkrainian(e.target.value)} />
                <Input value={editAnswer1} onChange={(e) => setEditAnswer1(e.target.value)} />
                <Input value={editAnswer2} onChange={(e) => setEditAnswer2(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={() => handleSaveEdit(w.id)}>Save</Button>
                  <Button variant="secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{w.ukrainian}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="text-gray-700">{w.answers.join(", ")}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => startEdit(w)}>
                    Edit
                  </Button>
                  {confirmDeleteId === w.id ? (
                    <>
                      <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </Button>
                      <Button variant="danger" onClick={() => handleDeleteWord(w.id)}>
                        Really?
                      </Button>
                    </>
                  ) : (
                    <Button variant="danger" onClick={() => setConfirmDeleteId(w.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
