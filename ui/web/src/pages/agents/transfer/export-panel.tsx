import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { OperationProgress } from "@/components/shared/operation-progress";
import { SectionPicker, PRESETS, type SectionDef } from "./section-picker";
import { useExport, useExportPreview } from "./hooks/use-export";
import type { AgentData } from "@/types/agent";

interface ExportPanelProps {
  agents: AgentData[];
  initialAgentId?: string;
}

export function ExportPanel({ agents, initialAgentId }: ExportPanelProps) {
  const { t } = useTranslation("agents");
  const [agentId, setAgentId] = useState(initialAgentId ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(PRESETS.standard));

  const agent = agents.find((a) => a.id === agentId);
  const { data: preview } = useExportPreview(agentId || null);
  const exp = useExport();

  const agentOptions = useMemo(
    () => agents.map((a) => ({ value: a.id, label: a.display_name || a.agent_key })),
    [agents],
  );

  const sections: SectionDef[] = useMemo(() => {
    const p = preview;
    return [
      { id: "config", labelKey: "transfer.sections.config", required: true },
      { id: "context_files", labelKey: "transfer.sections.contextFiles", count: p?.context_files },
      {
        id: "user_data", labelKey: "transfer.sections.userData", count: p?.user_context_files_users,
        countLabel: p ? `${p.user_context_files_users} users` : undefined,
        children: [
          { id: "user_context_files", labelKey: "transfer.sections.userContextFiles", count: p?.user_context_files_users },
          { id: "user_profiles", labelKey: "transfer.sections.userProfiles", count: p?.user_profiles },
          { id: "user_overrides", labelKey: "transfer.sections.userOverrides", count: p?.user_overrides },
        ],
      },
      {
        id: "memory", labelKey: "transfer.sections.memory",
        count: p ? p.memory_global + p.memory_per_user : undefined,
        countLabel: p ? `${p.memory_global + p.memory_per_user} docs` : undefined,
        children: [
          { id: "memory_global", labelKey: "transfer.sections.memoryGlobal", count: p?.memory_global },
          { id: "memory_per_user", labelKey: "transfer.sections.memoryPerUser", count: p?.memory_per_user },
        ],
      },
      {
        id: "knowledge_graph", labelKey: "transfer.sections.knowledgeGraph",
        countLabel: p ? `${p.kg_entities.toLocaleString()} ent / ${p.kg_relations.toLocaleString()} rel` : undefined,
      },
      { id: "skills", labelKey: "transfer.sections.skills", count: p?.skill_grants },
      { id: "mcp", labelKey: "transfer.sections.mcp", count: p?.mcp_grants },
      { id: "cron", labelKey: "transfer.sections.cron", count: p?.cron_jobs },
      { id: "permissions", labelKey: "transfer.sections.permissions", count: p?.config_perms },
      { id: "sessions", labelKey: "transfer.sections.sessions", comingSoon: true, hint: "transfer.hints.sessions" },
      { id: "workspace", labelKey: "transfer.sections.workspace", count: p?.workspace_files },
      { id: "team", labelKey: "transfer.sections.team",
        countLabel: p && (p.team_tasks > 0 || p.team_members > 0)
          ? `${p.team_members} members / ${p.team_tasks} tasks`
          : undefined,
        hint: "transfer.hints.team",
      },
      { id: "media", labelKey: "transfer.sections.media", comingSoon: true, hint: "transfer.hints.media" },
    ];
  }, [preview]);

  const handlePreset = (preset: keyof typeof PRESETS) => {
    setSelected(new Set(PRESETS[preset]));
  };

  const handleExport = () => {
    if (!agent) return;
    const secs = Array.from(selected).filter((s) => !s.startsWith("memory_") && !s.startsWith("user_"));
    exp.startExport(agent.id, secs);
  };

  // Idle state: show picker
  if (exp.status === "idle") {
    return (
      <div className="space-y-4">
        <div>
          <Label className="mb-1.5">{t("transfer.selectAgent")}</Label>
          <Combobox
            value={agentId}
            onChange={setAgentId}
            options={agentOptions}
            placeholder={t("transfer.selectAgentPlaceholder")}
          />
        </div>

        {agentId && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("transfer.presets")}:</span>
              {(["minimal", "standard", "complete"] as const).map((p) => (
                <Button
                  key={p}
                  variant={setsEqual(selected, PRESETS[p]) ? "default" : "outline"}
                  size="xs"
                  onClick={() => handlePreset(p)}
                >
                  {t(`transfer.preset.${p}`)}
                </Button>
              ))}
            </div>

            <SectionPicker sections={sections} selected={selected} onChange={setSelected} />

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                {agent && (agent.display_name || agent.agent_key)}
              </span>
              <Button onClick={handleExport} disabled={!agentId || selected.size === 0}>
                <Package className="mr-1.5 h-4 w-4" />
                {t("transfer.exportButton")}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Running / complete / error states
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">
        {exp.status === "complete"
          ? t("transfer.exportComplete")
          : exp.status === "error"
            ? t("transfer.exportFailed")
            : t("transfer.exporting", { name: agent?.display_name ?? "" })}
      </h3>

      <OperationProgress steps={exp.steps} elapsed={exp.elapsed} />

      {exp.status === "error" && exp.error && (
        <p className="text-sm text-destructive">{exp.error.detail}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        {exp.status === "running" && (
          <Button variant="outline" onClick={exp.cancel}>{t("transfer.cancel")}</Button>
        )}
        {exp.status === "complete" && exp.downloadReady && (
          <>
            <Button variant="outline" onClick={exp.reset}>{t("transfer.exportAnother")}</Button>
            <Button onClick={exp.download}>
              <Download className="mr-1.5 h-4 w-4" />
              {t("transfer.download")}
            </Button>
          </>
        )}
        {exp.status === "error" && (
          <Button variant="outline" onClick={exp.reset}>{t("transfer.tryAgain")}</Button>
        )}
      </div>
    </div>
  );
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
