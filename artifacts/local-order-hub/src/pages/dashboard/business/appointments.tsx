import { useState, useMemo, useRef } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  useListBusinessAppointmentRequests,
  useUpdateBusinessAppointmentRequestStatus,
  useListProducts,
  getListProductsQueryKey,
  getListBusinessAppointmentRequestsQueryKey,
  type AppointmentRequest,
} from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { ManualAppointmentDialog } from "@/components/manual-appointment-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Phone, Mail, Plus, Loader2 } from "lucide-react";
import {
  appointmentSourceLabel,
  appointmentStatusLabel,
  formatTime12h,
  isTerminalAppointmentStatus,
} from "@workspace/api-zod";
import { cn } from "@/lib/utils";
import { useAppointmentHighlight } from "@/hooks/order-dashboard-refresh-context";
import { orderStatusHighlightClass } from "@/components/order-row";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NEW: "default",
  CONFIRMED: "secondary",
  DECLINED: "destructive",
  CANCELLED: "outline",
  COMPLETED: "secondary",
};

const HIGHLIGHT_ROW_CLASS = {
  new: "order-row-new",
  updated: "order-row-updated",
} as const;

function AppointmentStatusBadge({ requestId, status }: { requestId: number; status: string }) {
  const highlight = useAppointmentHighlight(requestId);
  return (
    <Badge
      variant={STATUS_VARIANT[status] ?? "secondary"}
      className={orderStatusHighlightClass(highlight)}
    >
      {appointmentStatusLabel(status)}
    </Badge>
  );
}

function AppointmentRequestRow({
  request,
  busy,
  onConfirm,
  onDecline,
  onComplete,
  onCancel,
}: {
  request: AppointmentRequest;
  busy: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const highlight = useAppointmentHighlight(request.id);
  const terminal = isTerminalAppointmentStatus(request.status);

  return (
    <div
      className={cn("p-4 space-y-3", highlight && HIGHLIGHT_ROW_CLASS[highlight])}
      data-testid={`appointment-request-${request.id}`}
      data-appointment-highlight={highlight ?? undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{request.customerName}</p>
          <p className="text-sm text-muted-foreground">
            {request.requestedDate} at {formatTime12h(request.requestedTime)}
            {request.serviceName ? ` · ${request.serviceName}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {appointmentSourceLabel(request.source ?? "CUSTOMER")}
          </p>
        </div>
        <AppointmentStatusBadge requestId={request.id} status={request.status} />
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {request.customerEmail && (
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> {request.customerEmail}
          </span>
        )}
        {request.customerPhone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> {request.customerPhone}
          </span>
        )}
      </div>

      {request.notes && (
        <p className="text-sm bg-muted/40 rounded-md p-2">{request.notes}</p>
      )}
      {request.statusNote && (
        <p className="text-sm text-muted-foreground italic">Note: {request.statusNote}</p>
      )}

      {!terminal && (
        <div className={cn("flex flex-wrap gap-2 pt-1", busy && "opacity-60 pointer-events-none")}>
          {request.status === "NEW" && (
            <>
              <LoadingButton
                size="sm"
                loading={busy}
                loadingText="Confirming…"
                onClick={onConfirm}
                data-testid={`confirm-appointment-${request.id}`}
              >
                Confirm
              </LoadingButton>
              <Button
                size="sm"
                variant="outline"
                onClick={onDecline}
                data-testid={`decline-appointment-${request.id}`}
              >
                Decline
              </Button>
            </>
          )}
          {request.status === "CONFIRMED" && (
            <>
              <LoadingButton
                size="sm"
                loading={busy}
                loadingText="Saving…"
                onClick={onComplete}
              >
                Mark completed
              </LoadingButton>
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </>
          )}
          {request.status === "NEW" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={onCancel}
            >
              Cancel request
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function BusinessAppointments() {
  const { selectedBusinessId, isLoading: businessLoading } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [manualOpen, setManualOpen] = useState(false);
  const [declineTarget, setDeclineTarget] = useState<number | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { data: requests, isPending, isFetching } = useListBusinessAppointmentRequests(businessId, {
    query: {
      enabled: !!businessId,
      queryKey: getListBusinessAppointmentRequestsQueryKey(businessId),
      placeholderData: keepPreviousData,
    },
  });

  const lastRequestsRef = useRef<AppointmentRequest[]>([]);
  const requestList = useMemo(() => {
    if (Array.isArray(requests)) {
      lastRequestsRef.current = requests;
      return requests;
    }
    return lastRequestsRef.current;
  }, [requests]);

  const showInitialSkeleton = isPending && !requests && !lastRequestsRef.current.length;

  const { data: products = [] } = useListProducts(businessId, {
    query: { enabled: !!businessId, queryKey: getListProductsQueryKey(businessId) },
  });

  const services = products.map((p) => ({ id: p.id, name: p.name }));

  const invalidate = () =>
    void queryClient.invalidateQueries({
      queryKey: getListBusinessAppointmentRequestsQueryKey(businessId),
    });

  const updateStatus = useUpdateBusinessAppointmentRequestStatus({
    mutation: {
      onSuccess: (updated) => {
        invalidate();
        setUpdatingId(null);
        setDeclineTarget(null);
        setDeclineNote("");
        const label = appointmentStatusLabel(updated.status);
        toast({
          title: `Appointment ${label.toLowerCase()}`,
          description:
            updated.status === "CONFIRMED" || updated.status === "DECLINED"
              ? "The customer will be emailed if they provided an address."
              : undefined,
        });
      },
      onError: () => {
        setUpdatingId(null);
        toast({ title: "Could not update appointment", variant: "destructive" });
      },
    },
  });

  function runStatusUpdate(id: number, status: "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED", statusNote?: string) {
    setUpdatingId(id);
    updateStatus.mutate({
      businessId,
      id,
      data: { status, statusNote },
    });
  }

  return (
    <BusinessDashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">Appointments</h1>
            <p className="text-muted-foreground mt-1">
              Review customer requests and manage your schedule. Requests are not confirmed until you approve them.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isFetching && requests && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Updating
              </span>
            )}
            <Button onClick={() => setManualOpen(true)} data-testid="button-add-appointment">
              <Plus className="h-4 w-4 mr-2" /> Add appointment
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {businessLoading || showInitialSkeleton ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : requestList.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No appointments yet</p>
                <p className="text-sm mt-1">
                  Customer requests from your storefront appear here. Use Add appointment for phone or walk-in bookings.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {requestList.map((request) => {
                  const busy = updatingId === request.id && updateStatus.isPending;

                  return (
                    <AppointmentRequestRow
                      key={request.id}
                      request={request}
                      busy={busy}
                      onConfirm={() => runStatusUpdate(request.id, "CONFIRMED")}
                      onDecline={() => setDeclineTarget(request.id)}
                      onComplete={() => runStatusUpdate(request.id, "COMPLETED")}
                      onCancel={() => runStatusUpdate(request.id, "CANCELLED")}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ManualAppointmentDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        businessId={businessId}
        services={services}
      />

      <Dialog open={declineTarget != null} onOpenChange={(open) => !open && setDeclineTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Decline request</DialogTitle>
            <DialogDescription>
              The customer will be notified this is not confirmed. Add an optional note explaining why.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={declineNote}
            onChange={(e) => setDeclineNote(e.target.value)}
            placeholder="Optional note for the customer…"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineTarget(null)}>Back</Button>
            <LoadingButton
              variant="destructive"
              loading={updateStatus.isPending && updatingId === declineTarget}
              loadingText="Declining…"
              onClick={() => {
                if (declineTarget == null) return;
                runStatusUpdate(declineTarget, "DECLINED", declineNote.trim() || undefined);
              }}
            >
              Decline request
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessDashboardLayout>
  );
}
