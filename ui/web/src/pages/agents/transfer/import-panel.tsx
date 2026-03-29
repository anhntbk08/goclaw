import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Upload, FileArchive, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { OperationProgress } from "@/components/shared/operation-progress";
import { SectionPicker, type SectionDef } from "./section-picker";
import { useImport, type ImportMode } from "./hooks/use-import";
import { slugify, isValidSlug } from "@/lib/slug";
import type { AgentData } from "@/types/agent";

interface ImportPanelProps {
  agents: AgentData[];
}

export function ImportPanel({ agents }: ImportPanelProps) {
  const { t } = useTranslation("agents");
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<ImportMode>("new");
  const [agentKey, setAgentKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(
    new Set(["context_files", "memory", "knowledge_graph"]),
  );
  const [parseError, setParseError] = useState("");

  const imp = useImport();

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParseError("");
    const m = await imp.parseFile(f);
    if (!m) {
      setParseError(t("transfer.invalidFile"));
      return;
    }
    setAgentKey(m.agent_key || "");
    setDisplayName("");
    setKeyTouched(false);
    // Data-only files → force merge mode
    if (!m.sections.agent_config) setMode("merge");
  }, [imp, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleNameChange = (val: string) => {
    setDisplayName(val);
    if (!keyTouched) setAgentKey(slugify(val));
  };

  const handleSubmit = () => {
    if (!file) return;
    if (mode === "merge") {
      if (!mergeTarget) return;
      imp.startMerge(file, mergeTarget, Array.from(mergeSelected));
    } else {
      imp.startImport(file, {
        agent_key: agentKey || undefined,
        display_name: displayName || undefined,
      });
    }
  };

  const agentOptions = agents.map((a) => ({ value: a.id, label: a.display_name || a.agent_key }));

  const mergeSections: SectionDef[] = [
    { id: "context_files", labelKey: "transfer.sections.contextFiles", hint: "transfer.hints.mergeOverwrite" },
    { id: "memory", labelKey: "transfer.sections.memory", hint: "transfer.hints.mergeUpsert" },
    { id: "knowledge_graph", labelKey: "transfer.sections.knowledgeGraph", hint: "transfer.hints.mergeKgUpsert" },
    { id: "skills", labelKey: "transfer.sections.skills" },
    { id: "mcp", labelKey: "transfer.sections.mcp" },
    { id: "cron", labelKey: "transfer.sections.cron" },
    { id: "permissions", labelKey: "transfer.sections.permissions" },
    { id: "user_profiles", labelKey: "transfer.sections.userProfiles" },
    { id: "user_overrides", labelKey: "transfer.sections.userOverrides" },
    { id: "workspace", labelKey: "transfer.sections.workspace", hint: "transfer.hints.mergeFiles" },
    { id: "team", labelKey: "transfer.sections.team", hint: "transfer.hints.team" },
  ];

  // === Running / Complete / Error states ===
  if (imp.status !== "idle") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          {imp.status === "complete"
            ? t("transfer.importComplete")
            : imp.status === "error"
              ? t("transfer.importFailed")
              : t("transfer.importing")}
        </h3>

        <OperationProgress steps={imp.steps} elapsed={imp.elapsed} />

        {imp.status === "error" && imp.error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1">
            <p className="text-destructive font-medium">{imp.error.detail}</p>
            {imp.error.rolled_back && (
              <p className="text-muted-foreground text-xs">{t("transfer.rolledBack")}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          {imp.status === "running" && (
            <>
              <p className="text-xs text-amber-600 mr-auto flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("transfer.dontClose")}
              </p>
              <Button variant="outline" onClick={imp.cancel}>{t("transfer.cancel")}</Button>
            </>
          )}
          {imp.status === "complete" && imp.result && (
            <>
              <Button variant="outline" onClick={() => { imp.clearFile(); setFile(null); }}>
                {t("transfer.importAnother")}
              </Button>
              {imp.result.agent_id && (
                <Button onClick={() => navigate(`/agents/${imp.result!.agent_id}`)}>
                  {t("transfer.viewAgent")}
                </Button>
              )}
            </>
          )}
          {imp.status === "error" && (
            <Button variant="outline" onClick={() => { imp.clearFile(); setFile(null); }}>
              {t("transfer.tryAgain")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // === Idle state ===
  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!file && (
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("transfer.dropHere")}</p>
          <p className="text-xs text-muted-foreground/60">{t("transfer.supportedFormats")}</p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".tar.gz,.gz,.json,.agent.json"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {parseError && <p className="text-sm text-destructive">{parseError}</p>}

      {/* Preview + options */}
      {file && imp.manifest && (
        <>
          {/* File info */}
          <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <FileArchive className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </div>
            {imp.manifest.agent_key && (
              <div className="text-xs text-muted-foreground">
                Agent: {imp.manifest.agent_key} · v{imp.manifest.version}
              </div>
            )}
          </div>

          {/* Import mode */}
          <div>
            <Label>{t("transfer.importMode")}</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
              <SelectTrigger className="mt-1 text-base md:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">{t("transfer.modeNew")}</SelectItem>
                <SelectItem value="merge">{t("transfer.modeMerge")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* New agent fields */}
          {mode === "new" && (
            <>
              <div>
                <Label>{t("create.displayName")}</Label>
                <Input
                  value={displayName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t("create.displayNamePlaceholder")}
                  className="mt-1 text-base md:text-sm"
                />
              </div>
              <div>
                <Label>{t("create.agentKey")}</Label>
                <Input
                  value={agentKey}
                  onChange={(e) => { setAgentKey(e.target.value); setKeyTouched(true); }}
                  placeholder={t("create.agentKeyPlaceholder")}
                  className="mt-1 font-mono text-base md:text-sm"
                />
              </div>
            </>
          )}

          {/* Merge target + sections */}
          {mode === "merge" && (
            <>
              <div>
                <Label>{t("transfer.targetAgent")}</Label>
                <Combobox
                  value={mergeTarget}
                  onChange={setMergeTarget}
                  options={agentOptions}
                  placeholder={t("transfer.selectAgentPlaceholder")}
                />
              </div>
              <SectionPicker
                sections={mergeSections}
                selected={mergeSelected}
                onChange={setMergeSelected}
              />
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setFile(null); imp.clearFile(); }}>
              {t("transfer.changeFile")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                (mode === "new" && agentKey !== "" && !isValidSlug(agentKey))
                || (mode === "merge" && !mergeTarget)
              }
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {t("transfer.startImport")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
