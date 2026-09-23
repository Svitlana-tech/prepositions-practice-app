"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredStudentName } from "@/lib/studentName";
import { getOnboardingSeen, setOnboardingSeen } from "@/lib/onboarding";
import { NameCaptureForm } from "@/components/student/NameCaptureForm";
import { WelcomeScreen } from "@/components/student/WelcomeScreen";

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const name = getStoredStudentName();
    if (name) {
      router.replace("/tasks");
      return;
    }
    setShowWelcome(!getOnboardingSeen());
    setChecked(true);
  }, [router]);

  if (!checked) {
    return null;
  }

  if (showWelcome) {
    return (
      <WelcomeScreen
        onStart={() => {
          setOnboardingSeen();
          setShowWelcome(false);
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Preposition Master</h1>
      <p className="mb-6 text-gray-600">Enter your name to start practicing.</p>
      <NameCaptureForm />
    </div>
  );
}
