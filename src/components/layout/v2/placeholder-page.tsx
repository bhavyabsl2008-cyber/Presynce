"use client";

import { PageShell } from "./page-shell";

export function PlaceholderPage({ title, label }: { title: string, label?: string }) {
  return (
    <PageShell>
      <section className="px-8 lg:px-12 pt-10 pb-8 border-b border-line flex flex-col md:flex-row justify-between gap-8">
        <div>
          <h1
            className="font-bold tracking-tighter text-ink-v2 leading-[0.82] uppercase"
            style={{
              fontSize: "clamp(3.75rem, 8vw, 6.5rem)",
              fontFamily: "var(--font-display)",
            }}
          >
            {title}
          </h1>
          <p className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mt-2" style={{ fontFamily: "var(--font-data)" }}>
             MODULE IN DEVELOPMENT
          </p>
        </div>
      </section>
      
      <section className="px-8 lg:px-12 py-10">
         <p className="text-body-v2 text-ink-secondary font-medium leading-relaxed max-w-md">
            {label || "This feature is currently under construction and will be available in a future update."}
         </p>
      </section>
    </PageShell>
  );
}
