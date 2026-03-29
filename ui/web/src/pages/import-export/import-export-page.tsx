import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AgentExportPanel } from "./agent-export-panel";
import { AgentImportPanel } from "./agent-import-panel";

function ComingSoonPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-12 text-center">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function ImportExportPage() {
  const { t } = useTranslation("import-export");
  const [params, setParams] = useSearchParams();

  const scopeTab = params.get("tab") ?? "agents";
  const agentTab = params.get("agent") ?? "export";

  const setScopeTab = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", v);
    setParams(next, { replace: true });
  };

  const setAgentTab = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("agent", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="p-4 sm:p-6 pb-10 space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<Badge variant="warning">{t("beta")}</Badge>}
      />

      {/* Beta warning */}
      <div className="mx-auto max-w-3xl flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("betaWarning")}</span>
      </div>

      {/* Scope tabs */}
      <div className="mx-auto max-w-3xl">
        <Tabs value={scopeTab} onValueChange={setScopeTab}>
          <TabsList>
            <TabsTrigger value="teams">{t("tabs.teams")}</TabsTrigger>
            <TabsTrigger value="agents">{t("tabs.agents")}</TabsTrigger>
            <TabsTrigger value="skills-mcp">{t("tabs.skillsMcp")}</TabsTrigger>
          </TabsList>

          {/* Teams — coming soon */}
          <TabsContent value="teams" className="mt-4">
            <ComingSoonPlaceholder
              title={t("comingSoon.title")}
              description={t("comingSoon.description")}
            />
          </TabsContent>

          {/* Agents — export / import inner tabs */}
          <TabsContent value="agents" className="mt-4">
            <Tabs value={agentTab} onValueChange={setAgentTab}>
              <TabsList>
                <TabsTrigger value="export">{t("tabs.export")}</TabsTrigger>
                <TabsTrigger value="import">{t("tabs.import")}</TabsTrigger>
              </TabsList>

              <TabsContent value="export" className="mt-4">
                <AgentExportPanel />
              </TabsContent>

              <TabsContent value="import" className="mt-4">
                <AgentImportPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Skills & MCP — coming soon */}
          <TabsContent value="skills-mcp" className="mt-4">
            <ComingSoonPlaceholder
              title={t("comingSoon.title")}
              description={t("comingSoon.description")}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
