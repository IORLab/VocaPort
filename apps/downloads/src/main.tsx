import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DownloadsPage } from "./App";
import { loadReleaseCatalog } from "./catalog";
import "./index.css";
import type { ReleaseCatalog } from "./types";

type BootstrapState =
  | { status: "loading" }
  | { status: "ready"; catalog: ReleaseCatalog }
  | { status: "error"; message: string };

function DownloadsApp() {
  const [state, setState] = useState<BootstrapState>({ status: "loading" });

  useEffect(() => {
    void loadReleaseCatalog(`${import.meta.env.BASE_URL}releases.json`)
      .then((catalog) => {
        setState({ status: "ready", catalog });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Unknown loading error";
        setState({ status: "error", message });
      });
  }, []);

  if (state.status === "loading") {
    return (
      <main className="downloads-page">
        <section className="status-screen">
          <p className="hero-kicker">VocaPort</p>
          <h1>Loading downloads…</h1>
        </section>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="downloads-page">
        <section className="status-screen">
          <p className="hero-kicker">VocaPort</p>
          <h1>Could not load release data</h1>
          <p>{state.message}</p>
        </section>
      </main>
    );
  }

  return <DownloadsPage catalog={state.catalog} />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

createRoot(rootElement).render(<DownloadsApp />);
