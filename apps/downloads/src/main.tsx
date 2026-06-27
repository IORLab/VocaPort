import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DownloadsExperience, type DownloadsViewState } from "./App";
import { loadReleaseCatalog } from "./catalog";
import "./index.css";

function DownloadsApp() {
  const [state, setState] = useState<DownloadsViewState>({ status: "loading" });

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

  return <DownloadsExperience state={state} />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

createRoot(rootElement).render(<DownloadsApp />);
