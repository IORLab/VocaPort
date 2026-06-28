import { useState } from "react";
import { PageShell, PhaseOneWorkspace } from "@vocaport/ui";
import { createDesktopRuntime, openDesktopExternalUrl } from "./runtime";

export function App() {
  const [runtime] = useState(() => createDesktopRuntime());

  return (
    <PageShell>
      <PhaseOneWorkspace
        openExternalUrl={openDesktopExternalUrl}
        platformName="Desktop"
        runtime={runtime}
      />
    </PageShell>
  );
}
