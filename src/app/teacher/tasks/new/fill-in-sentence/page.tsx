import { Suspense } from "react";
import { FillInBlankForm } from "@/components/teacher/FillInBlankForm";

export default function NewFillInSentencePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">New Task: Type the Missing Word (Sentence)</h1>
      <Suspense>
        <FillInBlankForm taskType="FILL_IN_SENTENCE" />
      </Suspense>
    </div>
  );
}
