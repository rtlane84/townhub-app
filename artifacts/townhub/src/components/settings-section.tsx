import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex items-center gap-2.5">
          {Icon ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/8 text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <CardTitle className="font-serif text-xl tracking-tight text-platform-heading">{title}</CardTitle>
        </div>
        {description ? <CardDescription className="leading-relaxed">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("space-y-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function SettingsToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  "data-testid": testId,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  "data-testid"?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3.5 shadow-sm ring-1 ring-black/[0.04]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        data-testid={testId}
      />
    </div>
  );
}
