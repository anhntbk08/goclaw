import { useState, useCallback } from "react";
import { useHttp } from "@/hooks/use-ws";
import { useSseProgress } from "@/hooks/use-sse-progress";

export type ImportMode = "new" | "merge";

export interface ImportManifest {
  version: number;
  format: string;
  exported_at: string;
  agent_key: string;
  agent_id: string;
}

export function useImport() {
  const http = useHttp();
  const sse = useSseProgress(() => http.getAuthHeaders());
  const [manifest, setManifest] = useState<ImportManifest | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  /** Parse manifest from file without importing. */
  const parseFile = useCallback(
    async (file: File) => {
      setParseError(null);
      setManifest(null);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await http.upload<{ manifest: ImportManifest }>("/v1/agents/import/preview", form);
        setManifest(res.manifest ?? null);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : "Failed to parse archive");
      }
    },
    [http],
  );

  /** Import archive as a new agent (SSE). */
  const startImportNew = useCallback(
    (file: File, agentKey: string) => {
      const form = new FormData();
      form.append("file", file);
      if (agentKey) form.append("agent_key", agentKey);
      sse.startPost("/v1/agents/import?stream=true", form);
    },
    [sse],
  );

  /** Merge archive into an existing agent (SSE). */
  const startMerge = useCallback(
    (file: File, agentId: string, sections: string[]) => {
      const form = new FormData();
      form.append("file", file);
      const params = new URLSearchParams({ stream: "true", include: sections.join(",") });
      sse.startPost(`/v1/agents/${agentId}/import/merge?${params}`, form);
    },
    [sse],
  );

  const reset = useCallback(() => {
    sse.reset();
    setManifest(null);
    setParseError(null);
  }, [sse]);

  return { ...sse, manifest, parseError, parseFile, startImportNew, startMerge, reset };
}
