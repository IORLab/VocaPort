import { useState } from "react";
import { PageShell, PhaseOneWorkspace } from "@vocaport/ui";
import {
  createDesktopRuntime,
  hasNativeTauriRuntime,
  openDesktopExternalUrl,
  pickDesktopImportApkg,
} from "./runtime";

export function App() {
  const [runtime] = useState(() => createDesktopRuntime());

  return (
    <PageShell>
      <PhaseOneWorkspace
        pickImportFile={hasNativeTauriRuntime() ? pickDesktopImportApkg : undefined}
        openExternalUrl={openDesktopExternalUrl}
        platformName="Desktop"
        runtime={runtime}
      />
    </PageShell>
  );
}
