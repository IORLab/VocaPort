import type { PropsWithChildren } from "react";

export { PhaseOneWorkspace } from "./phase-one-workspace";

export function PageShell({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">VocaPort</h1>
      </header>
      {children}
    </main>
  );
}
