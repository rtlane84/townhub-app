import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import type { ConfirmActionCopy } from "@/lib/confirm-action-copy";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: ConfirmActionCopy | null;
  onConfirm: () => void;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
};

export function ConfirmActionDialog({
  open,
  onOpenChange,
  copy,
  onConfirm,
  loading = false,
  loadingText = "Working…",
  disabled = false,
}: Props) {
  if (!copy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">{copy.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground pt-1">
              {copy.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <LoadingButton
            type="button"
            variant={copy.destructive ? "destructive" : "default"}
            onClick={onConfirm}
            loading={loading}
            loadingText={loadingText}
            disabled={disabled}
          >
            {copy.confirmLabel}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
