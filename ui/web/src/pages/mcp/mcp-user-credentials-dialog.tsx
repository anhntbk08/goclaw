import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/stores/use-toast-store";
import i18next from "i18next";
import type { MCPServerData, MCPUserCredentialStatus, MCPUserCredentialInput } from "./hooks/use-mcp";

interface MCPUserCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: MCPServerData;
  onGetCredentials: (serverId: string) => Promise<MCPUserCredentialStatus>;
  onSetCredentials: (serverId: string, creds: MCPUserCredentialInput) => Promise<void>;
  onDeleteCredentials: (serverId: string) => Promise<void>;
}

function parseKVLines(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

export function MCPUserCredentialsDialog({
  open,
  onOpenChange,
  server,
  onGetCredentials,
  onSetCredentials,
  onDeleteCredentials,
}: MCPUserCredentialsDialogProps) {
  const { t } = useTranslation("mcp");
  const [status, setStatus] = useState<MCPUserCredentialStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [envText, setEnvText] = useState("");

  useEffect(() => {
    if (!open) return;
    setApiKey("");
    setHeadersText("");
    setEnvText("");
    setStatus(null);
    setLoadingStatus(true);
    onGetCredentials(server.id)
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, [open, server.id, onGetCredentials]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const creds: MCPUserCredentialInput = {};
      if (apiKey.trim()) creds.api_key = apiKey.trim();
      const headers = parseKVLines(headersText);
      if (Object.keys(headers).length > 0) creds.headers = headers;
      const env = parseKVLines(envText);
      if (Object.keys(env).length > 0) creds.env = env;
      await onSetCredentials(server.id, creds);
      toast.success(i18next.t("mcp:userCredentials.saved"));
      onOpenChange(false);
    } catch (err) {
      toast.error(i18next.t("mcp:userCredentials.saved"), err instanceof Error ? err.message : "");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDeleteCredentials(server.id);
      toast.success(i18next.t("mcp:userCredentials.deleted"));
      onOpenChange(false);
    } catch (err) {
      toast.error(i18next.t("mcp:userCredentials.deleted"), err instanceof Error ? err.message : "");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {t("userCredentials.title")}
          </DialogTitle>
          <DialogDescription>{t("userCredentials.description")}</DialogDescription>
        </DialogHeader>

        {loadingStatus ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {status && (
              <div className="flex flex-wrap gap-2">
                {!status.has_credentials ? (
                  <Badge variant="secondary">{t("userCredentials.noCredentials")}</Badge>
                ) : (
                  <>
                    {status.has_api_key && (
                      <Badge variant="default">{t("userCredentials.hasApiKey")}</Badge>
                    )}
                    {status.has_headers && (
                      <Badge variant="default">{t("userCredentials.hasHeaders")}</Badge>
                    )}
                    {status.has_env && (
                      <Badge variant="default">{t("userCredentials.hasEnv")}</Badge>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="uc-api-key">{t("userCredentials.apiKey")}</Label>
              <Input
                id="uc-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t("userCredentials.apiKeyPlaceholder")}
                className="text-base md:text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="uc-headers">{t("userCredentials.headers")}</Label>
              <Textarea
                id="uc-headers"
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                placeholder={t("userCredentials.headerPlaceholder")}
                className="text-base md:text-sm font-mono text-xs resize-none"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="uc-env">{t("userCredentials.env")}</Label>
              <Textarea
                id="uc-env"
                value={envText}
                onChange={(e) => setEnvText(e.target.value)}
                placeholder={t("userCredentials.headerPlaceholder")}
                className="text-base md:text-sm font-mono text-xs resize-none"
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {status?.has_credentials && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="sm:mr-auto"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {t("userCredentials.deleteAll")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || deleting}>
            {t("userCredentials.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || deleting || loadingStatus}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            {t("userCredentials.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
