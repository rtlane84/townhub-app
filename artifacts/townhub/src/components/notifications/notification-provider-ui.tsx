import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  formatLastSuccessfulTest,
  type ConnectionDisplayStatus,
} from "@/lib/notification-test-state";

type NotificationProviderCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  testId?: string;
  children: ReactNode;
};

export function NotificationProviderCard({
  title,
  description,
  icon,
  testId,
  children,
}: NotificationProviderCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

type ProviderConnectionStatusProps = {
  status: ConnectionDisplayStatus;
  lastSuccessAt?: Date | null;
  failureReason?: string | null;
  statusTestId?: string;
};

export function ProviderConnectionStatus({
  status,
  lastSuccessAt,
  failureReason,
  statusTestId,
}: ProviderConnectionStatusProps) {
  const statusLabel =
    status === "connected" ? "Connected" : status === "failed" ? "Connection failed" : "Not tested";

  return (
    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">Status</p>
        <p className="text-sm font-medium" data-testid={statusTestId}>
          {statusLabel}
        </p>
      </div>
      {status === "connected" && lastSuccessAt ? (
        <div>
          <p className="text-xs text-muted-foreground">Last successful test</p>
          <p className="text-sm">{formatLastSuccessfulTest(lastSuccessAt)}</p>
        </div>
      ) : null}
      {status === "failed" && failureReason ? (
        <div>
          <p className="text-xs text-muted-foreground">Reason</p>
          <p className="text-sm text-destructive">{failureReason}</p>
        </div>
      ) : null}
    </div>
  );
}

type ProviderActionButtonsProps = {
  onSave?: () => void;
  saveLoading?: boolean;
  saveLabel?: string;
  saveTestId?: string;
  showSave?: boolean;
  onTest: () => void;
  testLoading?: boolean;
  testLabel: string;
  testTestId?: string;
  testDisabled?: boolean;
  testDisabledTitle?: string;
};

export function ProviderActionButtons({
  onSave,
  saveLoading = false,
  saveLabel = "Save settings",
  saveTestId,
  showSave = true,
  onTest,
  testLoading = false,
  testLabel,
  testTestId,
  testDisabled = false,
  testDisabledTitle,
}: ProviderActionButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      {showSave && onSave ? (
        <LoadingButton
          onClick={onSave}
          loading={saveLoading}
          loadingText="Saving…"
          data-testid={saveTestId}
        >
          {saveLabel}
        </LoadingButton>
      ) : null}
      <LoadingButton
        variant="outline"
        onClick={onTest}
        loading={testLoading}
        loadingText="Sending…"
        disabled={testDisabled}
        title={testDisabled ? testDisabledTitle : undefined}
        data-testid={testTestId}
      >
        {testLabel}
      </LoadingButton>
    </div>
  );
}

export function ProviderSetupInstructions({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
      <p className="text-sm font-medium">Setup</p>
      {children}
    </div>
  );
}

export function ProviderEnableRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  testId,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} data-testid={testId} />
    </div>
  );
}
