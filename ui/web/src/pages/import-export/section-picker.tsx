import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SectionDef {
  id: string;
  children?: string[];
  comingSoon?: boolean;
}

export const PRESETS: Record<string, string[]> = {
  minimal: ["config", "context_files"],
  standard: ["config", "context_files", "memory", "knowledge_graph", "cron"],
  complete: [
    "config", "context_files",
    "user_data", "user_context_files", "user_profiles", "user_overrides",
    "memory", "memory_global", "memory_per_user",
    "knowledge_graph", "cron", "workspace",
  ],
};

interface SectionPickerProps {
  sections: SectionDef[];
  selected: string[];
  onChange: (selected: string[]) => void;
  ns?: string;
  className?: string;
}

export function SectionPicker({
  sections,
  selected,
  onChange,
  ns = "import-export",
  className,
}: SectionPickerProps) {
  const { t } = useTranslation(ns);

  const toggle = (id: string, sectionDef: SectionDef) => {
    const isOn = selected.includes(id);
    let next: string[];

    if (isOn) {
      // Deselect self + children
      const toRemove = new Set([id, ...(sectionDef.children ?? [])]);
      next = selected.filter((s) => !toRemove.has(s));
    } else {
      // Select self + children
      next = [...selected, id, ...(sectionDef.children ?? []).filter((c) => !selected.includes(c))];
    }
    onChange(next);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {sections.map((sec) => {
        const isOn = selected.includes(sec.id);
        const disabled = sec.comingSoon;
        return (
          <div
            key={sec.id}
            className={cn(
              "flex items-start gap-3 rounded-md border px-3 py-2.5",
              isOn ? "border-border bg-muted/30" : "border-transparent",
              disabled && "opacity-50",
            )}
          >
            <Switch
              id={`section-${sec.id}`}
              checked={isOn}
              onCheckedChange={() => !disabled && toggle(sec.id, sec)}
              disabled={disabled}
              className="mt-0.5 shrink-0"
            />
            <Label
              htmlFor={`section-${sec.id}`}
              className={cn("flex flex-col gap-0.5 cursor-pointer", disabled && "cursor-default")}
            >
              <span className="text-sm font-medium leading-none">
                {t(`sections.${sec.id}`, { defaultValue: sec.id })}
                {sec.comingSoon && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({t("sections.comingSoon", { defaultValue: "coming soon" })})
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(`sections.${sec.id}Desc`, { defaultValue: "" })}
              </span>
            </Label>
          </div>
        );
      })}
    </div>
  );
}
