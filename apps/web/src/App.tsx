import { useState } from "react";
import { PageShell, PhaseOneWorkspace } from "@vocaport/ui";
import { createWebRuntime } from "./runtime";

export function App() {
  const [runtime] = useState(() => createWebRuntime());

  return (
    <PageShell>
      <PhaseOneWorkspace platformName="Web" runtime={runtime} />
    </PageShell>
  );
}
