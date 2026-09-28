"use client";

import { usePathname } from "next/navigation";
import { RailNav } from "./rail-nav";
import { TabBar } from "./tab-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSetup = pathname === "/setup" || pathname.startsWith("/lab");

  return (
    <div className={`min-h-screen w-full ${isSetup ? "" : "md:grid md:grid-cols-[15rem_minmax(0,1fr)]"}`}>
      {!isSetup && <RailNav />}
      <main className={`min-w-0 ${isSetup ? "" : "pb-20 md:pb-0"}`}>{children}</main>
      {!isSetup && <TabBar />}
    </div>
  );
}
