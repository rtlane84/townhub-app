import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useCreateAppointmentRequest } from "@workspace/api-client-react";
import { TimePicker } from "@/components/time-picker";
import { normalizeRequiredTime } from "@workspace/api-zod";
import { Info } from "lucide-react";

type ProductOption = { id: number; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: number;
  businessName: string;
  services?: ProductOption[];
  initialProductId?: number | null;
};

export function AppointmentBookingDialog({
  open,
  onOpenChange,
  businessId,
  businessName,
  services = [],
  initialProductId = null,
}: Props) {
  const { toast } = useToast();
  const createRequest = useCreateAppointmentRequest();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [serviceName, setServiceName] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setProductId(initialProductId ? String(initialProductId) : "");
    setServiceName("");
    setRequestedDate("");
    setRequestedTime("");
    setNotes("");
  }

  useEffect(() => {
    if (open) {
      setProductId(initialProductId ? String(initialProductId) : "");
    }
  }, [open, initialProductId]);

  const submitRequest = useCallback(async () => {
    const time = normalizeRequiredTime(requestedTime);
    if (!customerName.trim() || !requestedDate || !time) {
      toast({
        title: "Missing details",
        description: "Please provide your name, preferred date, and time.",
        variant: "destructive",
      });
      return;
    }

    await createRequest.mutateAsync({
      data: {
        businessId,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        productId: productId ? parseInt(productId, 10) : undefined,
        serviceName: serviceName.trim() || undefined,
        requestedDate,
        requestedTime: time,
        notes: notes.trim() || undefined,
      },
    });
    toast({
      title: "Request submitted — not confirmed yet",
      description: `${businessName} will review your request and follow up. This is not a confirmed appointment.`,
    });
    resetForm();
    onOpenChange(false);
  }, [
    businessId,
    businessName,
    createRequest,
    customerEmail,
    customerName,
    customerPhone,
    notes,
    onOpenChange,
    productId,
    requestedDate,
    requestedTime,
    serviceName,
    toast,
  ]);

  const { run: runSubmit, pending: isSubmitting } = useAsyncAction(submitRequest);

  function handleSubmit() {
    void runSubmit().catch(() => {
      toast({
        title: "Could not submit request",
        description: "Please try again or call the business directly.",
        variant: "destructive",
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Request an Appointment</DialogTitle>
          <DialogDescription>
            Send a request to {businessName}. Your preferred time is not reserved until the business confirms.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            This is a <strong>request</strong>, not instant booking. {businessName} will contact you to confirm availability.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="appt-name">Your name</Label>
            <Input id="appt-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="appt-email">Email</Label>
              <Input id="appt-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="appt-phone">Phone</Label>
              <Input id="appt-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>
          {services.length > 0 ? (
            <div>
              <Label>Service (optional)</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={String(service.id)}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label htmlFor="appt-service">Service (optional)</Label>
              <Input id="appt-service" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Haircut, color, etc." />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="appt-date">Preferred date</Label>
              <Input id="appt-date" type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="appt-time">Preferred time</Label>
              <TimePicker
                id="appt-time"
                value={requestedTime}
                onChange={setRequestedTime}
                required
                data-testid="input-appt-time"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="appt-notes">Notes (optional)</Label>
            <Textarea id="appt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <LoadingButton onClick={handleSubmit} loading={isSubmitting} loadingText="Submitting…">
            Submit Request
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
