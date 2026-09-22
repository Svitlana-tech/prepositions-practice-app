import { Suspense } from "react";
import { ClozeWordBankForm } from "@/components/teacher/ClozeWordBankForm";

export default function NewClozeWordBankPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">New Task: Gap Fill (Word Bank)</h1>
      <Suspense>
        <ClozeWordBankForm />
      </Suspense>
    </div>
  );
}
