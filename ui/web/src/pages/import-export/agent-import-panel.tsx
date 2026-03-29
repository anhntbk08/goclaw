import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { OperationProgress } from "@/components/shared/operation-progress";
import { useAgents } from "@/pages/agents/hooks/use-agents";
import { SectionPicker, PRESETS, type SectionDef } from "./section-picker";
import { useImport, type ImportMode } from "./hooks/use-agent-import";
import { isValidSlug, slugify } from "@/lib/slug";

const MERGE_SECTIONS: SectionDef[] = [
  { id: "context_files" },
  { id: "memory" },
  { id: "knowledge_graph" },
  { id: "cron" },
  { id: "user_profiles" },
  { id: "user_overrides" },
  { id: "workspace" },
];

export function AgentImportPanel() {
  const { t } = useTranslation("import-export");
  const { agents } = useAgents();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ImportMode>("new");
  const [file, setFile] = useState<File | null>(null);
  const [agentKey, setAgentKey] = useState("");
  const [targetAgentId, setTargetAgentId] = useState("");
  const [mergeSections, setMergeSections] = useState<string[]>(PRESETS["standard"] ?? []);

  const { steps, status, error, elapsed, result, manifest, parseError, parseFile, startImportNew, startMerge, reset } =
    useImport();

  const agentOptions = useMemo(
    () => agents.map((a) => ({ value: a.id, label: a.display_name || a.agent_key })),
    [agents],
  );

  const activeMergeSections = useMemo(
    () => mergeSections.filter((s) => !["user_data", "memory"].includes(s)),
    [mergeSections],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    reset();
    if (f) parseFile(f);
  };

  const handleAgentKeyBlur = () => {
    if (agentKey && !isValidSlug(agentKey)) {
      setAgentKey(slugify(agentKey));
    }
  };

  const handleSubmit = () => {
    if (!file) return;
    if (mode === "new") {
      startImportNew(file, agentKey);
    } else {
      if (!targetAgentId) return;
      startMerge(file, targetAgentId, activeMergeSections);
    }
  };

  const isRunning = status === "running";
  const isDone = status === "complete";
  const isError = status === "error";
  const canSubmit = !!file && !isRunning && (mode === "new" || !!targetAgentId);

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("import.mode")}</Label>
        <div className="flex gap-2">
          {(["new", "merge"] as ImportMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); reset(); }}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                mode === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent hover:bg-muted"
              }`}
            >
              {m === "new" ? t("import.modeNew") : t("import.modeMerge")}
            </button>
          ))}
        </div>
      </div>

      {/* File picker */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("import.file")}</Label>
        <div
          className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-3 hover:bg-muted/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate">
            {file ? file.name : t("import.filePlaceholder")}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".tar.gz,.tgz"
          className="hidden"
          onChange={handleFileChange}
        />
        {parseError && (
          <p className="text-xs text-destructive">{parseError}</p>
        )}
        {manifest && (
          <p className="text-xs text-muted-foreground">
            {t("import.agentFrom", { key: manifest.agent_key })}
            {manifest.exported_at && (
              <> · {t("import.exportedAt", { date: new Date(manifest.exported_at).toLocaleDateString() })}</>
            )}
          </p>
        )}
      </div>

      {/* New agent: agent key override */}
      {mode === "new" && (
        <div className="space-y-1.5">
          <Label htmlFor="import-agent-key" className="text-sm font-medium">
            {t("import.agentKey")}
          </Label>
          <Input
            id="import-agent-key"
            value={agentKey}
            onChange={(e) => setAgentKey(e.target.value)}
            onBlur={handleAgentKeyBlur}
            placeholder={manifest?.agent_key ?? t("import.agentKeyPlaceholder")}
            className="text-base md:text-sm"
          />
          <p className="text-xs text-muted-foreground">{t("import.agentKeyHint")}</p>
        </div>
      )}

      {/* Merge: target agent selector */}
      {mode === "merge" && (
        <>
          <div className="space-y-1.5">
            <Label className="mb-1.5 text-sm font-medium">{t("import.targetAgent")}</Label>
            <Combobox
              value={targetAgentId}
              onChange={setTargetAgentId}
              options={agentOptions}
              placeholder={t("import.targetAgentPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("import.sections")}</Label>
            <SectionPicker
              sections={MERGE_SECTIONS}
              selected={mergeSections}
              onChange={setMergeSections}
            />
          </div>
        </>
      )}

      {/* Progress */}
      {(isRunning || isDone || isError) && (
        <OperationProgress steps={steps} elapsed={elapsed} />
      )}

      {/* Error */}
      {isError && error && (
        <p className="text-sm text-destructive">{error.detail}</p>
      )}

      {/* Done message */}
      {isDone && result && (
        <p className="text-sm text-muted-foreground text-center">
          {mode === "new"
            ? t("import.agentCreated", { key: result.agent_key ?? "" })
            : t("import.mergedInto", { key: result.agent_key ?? "" })}
        </p>
      )}

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
        {isRunning ? t("import.importing") : t("import.startImport")}
      </Button>
    </div>
  );
}
