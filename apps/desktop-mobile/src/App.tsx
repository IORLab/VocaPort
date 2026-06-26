import { useState } from "react";
import { PageShell, PhaseOneWorkspace } from "@vocaport/ui";
import { createDesktopRuntime } from "./runtime";

export function App() {
  const [runtime] = useState(() => createDesktopRuntime());

  return (
    <PageShell>
      <PhaseOneWorkspace platformName="Desktop" runtime={runtime} />
    </PageShell>
  );
}
