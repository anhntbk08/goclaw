import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Download, Package, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { OperationProgress } from "@/components/shared/operation-progress";
import { useTeamExportPreview, useTeamExport } from "./hooks/use-team-export";
import type { TeamData } from "@/types/team";

interface TeamExportPanelProps {
  teams: TeamData[];
  loading: boolean;
  loadTeams: () => void;
}

export function TeamExportPanel({ teams, loading, loadTeams }: TeamExportPanelProps) {
  const { t } = useTranslation("import-export");
  const [teamId, setTeamId] = useState("");

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const { data: preview, isLoading: previewLoading, error: previewError } = useTeamExportPreview(teamId || null);
  const exp = useTeamExport();

  const teamOptions = useMemo(
    () => teams.map((t) => ({ value: t.id, label: t.name })),
    [teams],
  );

  const team = teams.find((t) => t.id === teamId);

  if (exp.status !== "idle") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          {exp.status === "complete" ? t("export.done") : exp.status === "error" ? t("export.errorTitle") : t("export.exporting")}
        </h3>
        <OperationProgress steps={exp.steps} elapsed={exp.elapsed} />
        {exp.status === "error" && exp.error && (
          <p className="text-sm text-destructive">{exp.error.detail}</p>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          {exp.status === "running" && <Button variant="outline" onClick={exp.cancel}>{t("common.cancel", { ns: "common" })}</Button>}
          {exp.status === "complete" && exp.downloadReady && (
            <>
              <Button variant="outline" onClick={exp.reset}>{t("export.startExport")}</Button>
              <Button onClick={exp.download}><Download className="mr-1.5 h-4 w-4" />{t("export.download")}</Button>
            </>
          )}
          {exp.status === "error" && <Button variant="outline" onClick={exp.reset}>{t("export.startExport")}</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{t("teamExportNote")}</p>
      </div>

      <div>
        <Label className="mb-1.5">{t("tabs.teams")}</Label>
        <Combobox
          value={teamId}
          onChange={setTeamId}
          options={teamOptions}
          placeholder={loading ? "Loading..." : t("teamSelectPlaceholder")}
        />
      </div>

      {teamId && previewLoading && (
        <p className="text-sm text-muted-foreground">Loading preview...</p>
      )}

      {teamId && previewError && (
        <p className="text-sm text-destructive">Failed to load preview</p>
      )}

      {teamId && preview && (
        <>
          <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
            <p className="font-medium">{preview.team_name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{preview.members} members</span>
              <span>{preview.agent_count} agents</span>
              <span>{preview.tasks} tasks</span>
              {preview.agent_links > 0 && <span>{preview.agent_links} links</span>}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">{team?.name}</span>
            <Button onClick={() => exp.startExport(teamId)} disabled={!teamId}>
              <Package className="mr-1.5 h-4 w-4" />
              {t("export.startExport")}
            </Button>
          </div>
        </>
      )}

      {teamId && !previewLoading && !previewError && !preview && (
        <div className="flex items-center justify-end pt-2">
          <Button onClick={() => exp.startExport(teamId)} disabled={!teamId}>
            <Package className="mr-1.5 h-4 w-4" />
            {t("export.startExport")}
          </Button>
        </div>
      )}
    </div>
  );
}
