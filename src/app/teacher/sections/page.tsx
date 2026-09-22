"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Section = {
  id: string;
  name: string;
  order: number;
  isPublished: boolean;
  _count: { categories: number; vocabBanks: number };
};

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/teacher/sections")
      .then((res) => res.json())
      .then((data) => setSections(data.sections ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setAddError(null);
    const res = await fetch("/api/teacher/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (res.ok) {
      setNewName("");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? "Could not add the section.");
    }
  }

  function startRename(s: Section) {
    setRenamingId(s.id);
    setRenameValue(s.name);
    setRenameError(null);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
    setRenameError(null);
  }

  async function saveRename(id: string) {
    if (!renameValue.trim()) return;
    const res = await fetch(`/api/teacher/sections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (res.ok) {
      cancelRename();
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setRenameError(data.error ?? "Could not rename the section.");
    }
  }

  async function togglePublished(s: Section) {
    await fetch(`/api/teacher/sections/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !s.isPublished }),
    });
    load();
  }

  async function move(index: number, direction: -1 | 1) {
    const other = sections[index + direction];
    const current = sections[index];
    if (!other) return;
    await Promise.all([
      fetch(`/api/teacher/sections/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: other.order }),
      }),
      fetch(`/api/teacher/sections/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: current.order }),
      }),
    ]);
    load();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/teacher/sections/${id}`, { method: "DELETE" });
    setConfirmingId(null);
    if (res.ok) {
      setDeleteError(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "Could not delete the section.");
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Sections</h1>
      <p className="mb-6 text-sm text-gray-500">
        Sections are the first thing a student picks — e.g. Vocabulary, Grammar, Exam tasks. Assign
        each topic (on the Topics page) and vocab bank to a section so it shows up here for
        students. A section with nothing in it yet still shows as a button — students just see
        &quot;nothing here yet&quot; until you add something.
      </p>

      {loading && <p className="text-gray-500">Loading...</p>}

      {!loading && (
        <div className="flex flex-col gap-3">
          {sections.map((s, index) => {
            const isRenaming = renamingId === s.id;
            const isEmpty = s._count.categories === 0 && s._count.vocabBanks === 0;
            return (
              <Card key={s.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === sections.length - 1}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>

                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveRename(s.id)}
                        className="max-w-xs"
                      />
                      <Button variant="secondary" onClick={() => saveRename(s.id)}>
                        Save
                      </Button>
                      <Button variant="secondary" onClick={cancelRename}>
                        Cancel
                      </Button>
                      {renameError && <span className="text-sm text-red-600">{renameError}</span>}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{s.name}</span>
                        {!s.isPublished && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            hidden
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {s._count.categories} topic(s) · {s._count.vocabBanks} vocab bank(s)
                      </div>
                    </div>
                  )}
                </div>

                {!isRenaming && (
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => startRename(s)}>
                      Rename
                    </Button>
                    <Button variant="secondary" onClick={() => togglePublished(s)}>
                      {s.isPublished ? "Hide" : "Show"}
                    </Button>
                    {confirmingId === s.id ? (
                      <>
                        <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                          Cancel
                        </Button>
                        <Button variant="danger" onClick={() => handleDelete(s.id)}>
                          Really delete?
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="danger"
                        onClick={() => {
                          setDeleteError(null);
                          setConfirmingId(s.id);
                        }}
                        title={isEmpty ? undefined : "Its topics/banks will just become unsectioned"}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

          <div className="mt-2 flex gap-2">
            <Input
              placeholder="New section name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={saving || !newName.trim()}>
              + Add section
            </Button>
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
        </div>
      )}
    </div>
  );
}
