import type { PropsWithChildren } from "react";

export function PageShell({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">VocaPort</h1>
      </header>
      {children}
    </main>
  );
}
