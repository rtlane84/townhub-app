import { useMemo, useState } from "react";
import type { Order } from "@workspace/api-client-react";
import { useRefundOrder, getGetOrderQueryKey, getListBusinessOrdersQueryKey } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatRefundAmount, formatRefundAmountCents } from "@/lib/order-refund-display";

type RefundMode = "full" | "partial";

interface OrderRefundDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderRefundDialog({ order, open, onOpenChange }: OrderRefundDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<RefundMode>("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [reason, setReason] = useState("Customer requested refund");

  const refundedAmount = order.refundedAmount ?? 0;
  const refundableAmount = order.refundableAmount ?? Math.max(0, order.total - refundedAmount);
  const refundableCents = Math.round(refundableAmount * 100);

  const selectedAmountCents = useMemo(() => {
    if (mode === "full") return refundableCents;
    const parsed = Number.parseFloat(partialAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  }, [mode, partialAmount, refundableCents]);

  const refundMutation = useRefundOrder({
    mutation: {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(order.id) });
        if (order.businessId) {
          queryClient.invalidateQueries({ queryKey: getListBusinessOrdersQueryKey(order.businessId) });
        }
        toast({
          title: "Refund issued",
          description: `${formatRefundAmountCents(result.refund.amountCents)} refunded to the customer.`,
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast({
          title: "Refund failed",
          description: error instanceof Error ? error.message : "Unable to process refund.",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast({ title: "Reason required", description: "Please enter a refund reason.", variant: "destructive" });
      return;
    }

    if (selectedAmountCents <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid refund amount.", variant: "destructive" });
      return;
    }

    if (selectedAmountCents > refundableCents) {
      toast({
        title: "Amount too high",
        description: `Maximum refundable amount is ${formatRefundAmount(refundableAmount)}.`,
        variant: "destructive",
      });
      return;
    }

    refundMutation.mutate({
      id: order.id,
      data: {
        amountCents: selectedAmountCents,
        reason: reason.trim(),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue refund</DialogTitle>
          <DialogDescription>
            Refund {formatRefundAmountCents(selectedAmountCents)} to the customer? Stripe will return the payment to
            the original payment method. This cannot usually be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Order total</span>
              <span className="font-medium">{formatRefundAmount(order.total)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Already refunded</span>
              <span className="font-medium">{formatRefundAmount(refundedAmount)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Remaining refundable</span>
              <span className="font-medium">{formatRefundAmount(refundableAmount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Refund type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "full" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("full")}
                data-testid="button-refund-full"
              >
                Full refund
              </Button>
              <Button
                type="button"
                variant={mode === "partial" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("partial")}
                data-testid="button-refund-partial"
              >
                Custom amount
              </Button>
            </div>
          </div>

          {mode === "partial" ? (
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund amount</Label>
              <Input
                id="refund-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={refundableAmount}
                value={partialAmount}
                onChange={(event) => setPartialAmount(event.target.value)}
                placeholder="0.00"
                data-testid="input-refund-amount"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason</Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              data-testid="input-refund-reason"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={refundMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={refundMutation.isPending}
            data-testid="button-confirm-refund"
          >
            {refundMutation.isPending ? "Processing…" : `Refund ${formatRefundAmountCents(selectedAmountCents)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
