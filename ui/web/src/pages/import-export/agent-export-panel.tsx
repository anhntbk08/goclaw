import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { OperationProgress } from "@/components/shared/operation-progress";
import { useAgents } from "@/pages/agents/hooks/use-agents";
import { SectionPicker, PRESETS, type SectionDef } from "./section-picker";
import { useExportPreview, useExport } from "./hooks/use-agent-export";

const EXPORT_SECTIONS: SectionDef[] = [
  { id: "config" },
  { id: "context_files" },
  { id: "user_data", children: ["user_context_files", "user_profiles", "user_overrides"] },
  { id: "memory", children: ["memory_global", "memory_per_user"] },
  { id: "knowledge_graph" },
  { id: "cron" },
  { id: "workspace" },
  { id: "sessions", comingSoon: true },
  { id: "media", comingSoon: true },
];

const PRESET_BUTTONS = ["minimal", "standard", "complete"] as const;

export function AgentExportPanel() {
  const { t } = useTranslation("import-export");
  const { agents } = useAgents();
  const [agentId, setAgentId] = useState("");
  const [selected, setSelected] = useState<string[]>(PRESETS["standard"] ?? []);

  const { data: preview, isFetching: previewLoading } = useExportPreview(agentId || null);
  const { steps, status, error, elapsed, result, startExport, download } = useExport();

  const agentOptions = useMemo(
    () => agents.map((a) => ({ value: a.id, label: a.display_name || a.agent_key })),
    [agents],
  );

  const activeSections = useMemo(
    () => selected.filter((s) => !["user_data", "memory"].includes(s)),
    [selected],
  );

  const handleExport = () => {
    if (!agentId) return;
    startExport(agentId, activeSections);
  };

  const applyPreset = (preset: keyof typeof PRESETS) => {
    setSelected(PRESETS[preset] ?? []);
  };

  const isRunning = status === "running";
  const isDone = status === "complete";
  const isError = status === "error";

  return (
    <div className="space-y-5">
      {/* Info note */}
      <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("export.infoNote")}</span>
      </div>

      {/* Agent selector */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("export.agent")}</Label>
        <Combobox
          value={agentId}
          onChange={setAgentId}
          options={agentOptions}
          placeholder={t("export.agentPlaceholder")}
        />
      </div>

      {/* Preset buttons */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("export.presetsLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_BUTTONS.map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(p)}
              className="h-7 text-xs"
            >
              {t(`presets.${p}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Section picker */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("export.sections")}</Label>
        {agentId && preview && !previewLoading && (
          <p className="text-xs text-muted-foreground">
            {preview.context_files} context files · {preview.memory_global + preview.memory_per_user} memory docs ·{" "}
            {preview.kg_entities} KG entities · {preview.cron_jobs} cron jobs · {preview.workspace_files} workspace files
          </p>
        )}
        {previewLoading && (
          <p className="text-xs text-muted-foreground">{t("export.previewLoading")}</p>
        )}
        <SectionPicker
          sections={EXPORT_SECTIONS}
          selected={selected}
          onChange={setSelected}
        />
      </div>

      {/* Progress */}
      {(isRunning || isDone || isError) && (
        <OperationProgress steps={steps} elapsed={elapsed} />
      )}

      {/* Error detail */}
      {isError && error && (
        <p className="text-sm text-destructive">{error.detail}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleExport}
          disabled={!agentId || isRunning}
          className="flex-1"
        >
          {isRunning ? t("export.exporting") : t("export.startExport")}
        </Button>
        {isDone && result?.download_url && (
          <Button variant="outline" onClick={download}>
            <Download className="mr-1.5 h-4 w-4" />
            {t("export.download")}
          </Button>
        )}
      </div>

      {isDone && (
        <p className="text-sm text-muted-foreground text-center">{t("export.done")}</p>
      )}
    </div>
  );
}
