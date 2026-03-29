import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { ArrowLeftRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgents } from "../hooks/use-agents";
import { ExportPanel } from "./export-panel";
import { ImportPanel } from "./import-panel";

export function TransferPage() {
  const { t } = useTranslation("agents");
  const { agents } = useAgents();
  const [params] = useSearchParams();

  const defaultTab = params.get("tab") === "import" ? "import" : "export";
  const initialAgentId = params.get("agent") ?? undefined;

  return (
    <div className="mx-auto max-w-2xl p-3 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">{t("transfer.title")}</h1>
      </div>
      <p className="text-sm text-muted-foreground">{t("transfer.description")}</p>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="export">{t("transfer.tabExport")}</TabsTrigger>
          <TabsTrigger value="import">{t("transfer.tabImport")}</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="mt-4">
          <ExportPanel agents={agents} initialAgentId={initialAgentId} />
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <ImportPanel agents={agents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
