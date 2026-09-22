import { Suspense } from "react";
import { FillInBlankForm } from "@/components/teacher/FillInBlankForm";

export default function NewFillInTextPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">New Task: Type the Missing Words (Text)</h1>
      <Suspense>
        <FillInBlankForm taskType="FILL_IN_TEXT" />
      </Suspense>
    </div>
  );
}
