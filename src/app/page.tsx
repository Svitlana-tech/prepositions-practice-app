"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredStudentName } from "@/lib/studentName";
import { getOnboardingSeen, setOnboardingSeen } from "@/lib/onboarding";
import { NameCaptureForm } from "@/components/student/NameCaptureForm";
import { WelcomeScreen } from "@/components/student/WelcomeScreen";
import { WelcomeHero } from "@/components/student/WelcomeHero";

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
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-5 pb-8">
      <WelcomeHero subtitle="10 quick cards · 2 minutes a day" />
      <NameCaptureForm />
    </div>
  );
}
