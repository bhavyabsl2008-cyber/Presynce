"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";

export default function Home() {
  const router = useRouter();
  const student = useStore((state) => state.student);

  useEffect(() => {
    // If not hydrated yet, Zustand persist will handle it shortly
    // But we check if student exists
    if (!student || !student.isOnboarded) {
      router.replace("/onboarding");
    } else {
      router.replace("/today");
    }
  }, [student, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="w-4 h-4 rounded-full border-2 border-ink-v2 border-t-transparent animate-spin" />
    </div>
  );
}
