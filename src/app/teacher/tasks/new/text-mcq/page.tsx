import { Suspense } from "react";
import { TextMcqForm } from "@/components/teacher/TextMcqForm";

export default function NewTextMcqPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">New Task: Missing Words in a Text</h1>
      <Suspense>
        <TextMcqForm />
      </Suspense>
    </div>
  );
}
