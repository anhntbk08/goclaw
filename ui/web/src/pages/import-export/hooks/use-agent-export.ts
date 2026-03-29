import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHttp } from "@/hooks/use-ws";
import { useSseProgress } from "@/hooks/use-sse-progress";

export interface ExportPreview {
  context_files: number;
  user_context_files_users: number;
  memory_global: number;
  memory_per_user: number;
  kg_entities: number;
  kg_relations: number;
  cron_jobs: number;
  user_profiles: number;
  user_overrides: number;
  workspace_files: number;
}

export function useExportPreview(agentId: string | null) {
  const http = useHttp();
  return useQuery({
    queryKey: ["agents", agentId, "export-preview"],
    queryFn: () => http.get<ExportPreview>(`/v1/agents/${agentId}/export/preview`),
    enabled: !!agentId,
    staleTime: 30_000,
  });
}

export function useExport() {
  const http = useHttp();
  const sse = useSseProgress(() => http.getAuthHeaders());

  const startExport = useCallback(
    (agentId: string, sections: string[]) => {
      const params = new URLSearchParams({ sections: sections.join(","), stream: "true" });
      sse.startGet(`/v1/agents/${agentId}/export?${params}`);
    },
    [sse],
  );

  const download = useCallback(async () => {
    if (!sse.result?.download_url) return;
    const blob = await http.downloadBlob(sse.result.download_url);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sse.result.file_name ?? "agent-export.tar.gz";
    a.click();
    URL.revokeObjectURL(url);
  }, [http, sse.result]);

  return { ...sse, startExport, download };
}
