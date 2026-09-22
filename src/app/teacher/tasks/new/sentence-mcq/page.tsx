import { Suspense } from "react";
import { SentenceMcqForm } from "@/components/teacher/SentenceMcqForm";

export default function NewSentenceMcqPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">New Task: Missing Word</h1>
      <Suspense>
        <SentenceMcqForm />
      </Suspense>
    </div>
  );
}
