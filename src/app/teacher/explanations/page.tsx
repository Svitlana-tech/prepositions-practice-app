"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

type Entry = {
  id: string;
  label: string;
  text: string;
  _count: { tasks: number };
};

export default function ExplanationsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const [newLabel, setNewLabel] = useState("");
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/teacher/explanations")
      .then((res) => res.json())
      .then((data) => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd() {
    if (!newLabel.trim() || !newText.trim()) return;
    setAdding(true);
    setAddError(null);
    const res = await fetch("/api/teacher/explanations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim(), text: newText.trim() }),
    });
    setAdding(false);
    if (res.ok) {
      setNewLabel("");
      setNewText("");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? "Could not add the rule.");
    }
  }

  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setEditLabel(entry.label);
    setEditText(entry.text);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    if (!editLabel.trim() || !editText.trim()) return;
    setEditSaving(true);
    setEditError(null);
    const res = await fetch(`/api/teacher/explanations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editLabel.trim(), text: editText.trim() }),
    });
    setEditSaving(false);
    if (res.ok) {
      cancelEdit();
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? "Could not save the changes.");
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/teacher/explanations/${id}`, { method: "DELETE" });
    setConfirmingId(null);
    load();
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Rule bank</h1>
      <p className="mb-6 text-sm text-gray-500">
        Long explanations shared by several questions (e.g. every &quot;apply for&quot; sentence,
        every &quot;agree with/on/to&quot; sentence) — write a rule once here, then link it from
        any question&apos;s edit form. Editing the text below updates every linked question at
        once.
      </p>

      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-medium text-gray-900">Add a new rule</h2>
        <div className="flex flex-col gap-2">
          <Input
            placeholder='Short name, e.g. "apply for / apply to"'
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <Textarea
            rows={4}
            className="font-sans"
            placeholder="The full rule text students will read"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
          />
          <div>
            <Button onClick={handleAdd} disabled={adding || !newLabel.trim() || !newText.trim()}>
              {adding ? "Saving..." : "Add rule"}
            </Button>
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
        </div>
      </Card>

      {loading && <p className="text-gray-500">Loading...</p>}

      {!loading && entries.length === 0 && (
        <p className="text-sm text-gray-500">No rules saved yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {entries.map((entry) => {
          const isEditing = editingId === entry.id;
          return (
            <Card key={entry.id}>
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                  <Textarea
                    rows={5}
                    className="font-sans"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveEdit(entry.id)}
                      disabled={editSaving || !editLabel.trim() || !editText.trim()}
                    >
                      {editSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="secondary" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                  {editError && <p className="text-sm text-red-600">{editError}</p>}
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-gray-900">{entry.label}</div>
                      <div className="text-sm text-gray-500">
                        Used by {entry._count.tasks} question{entry._count.tasks === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="secondary" onClick={() => startEdit(entry)}>
                        Edit
                      </Button>
                      {confirmingId === entry.id ? (
                        <>
                          <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                            Cancel
                          </Button>
                          <Button variant="danger" onClick={() => handleDelete(entry.id)}>
                            Really delete?
                          </Button>
                        </>
                      ) : (
                        <Button variant="danger" onClick={() => setConfirmingId(entry.id)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{entry.text}</p>
                  {confirmingId === entry.id && entry._count.tasks > 0 && (
                    <p className="mt-2 text-sm text-amber-700">
                      {entry._count.tasks} question{entry._count.tasks === 1 ? "" : "s"} currently
                      show this rule — deleting it will leave them with no &quot;Read full
                      explanation&quot; link (their own short explanation, if any, still shows).
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
