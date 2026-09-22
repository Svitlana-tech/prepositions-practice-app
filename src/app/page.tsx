"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredStudentName } from "@/lib/studentName";
import { NameCaptureForm } from "@/components/student/NameCaptureForm";

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const name = getStoredStudentName();
    if (name) {
      router.replace("/tasks");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">English Practice</h1>
      <p className="mb-6 text-gray-600">Enter your name to start practicing.</p>
      <NameCaptureForm />
    </div>
  );
}
