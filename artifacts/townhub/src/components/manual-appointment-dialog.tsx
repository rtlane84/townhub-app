import { useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAsyncAction } from "@/hooks/use-async-action";
import {
  useCreateBusinessAppointmentRequest,
  useListProducts,
  getListBusinessAppointmentRequestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TimePicker } from "@/components/time-picker";
import { normalizeRequiredTime } from "@workspace/api-zod";

type ProductOption = { id: number; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: number;
  services?: ProductOption[];
};

export function ManualAppointmentDialog({
  open,
  onOpenChange,
  businessId,
  services = [],
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRequest = useCreateBusinessAppointmentRequest();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [productId, setProductId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setProductId("");
    setServiceName("");
    setRequestedDate("");
    setRequestedTime("");
    setNotes("");
  }

  const submit = useCallback(async () => {
    const time = normalizeRequiredTime(requestedTime);
    if (!customerName.trim() || !requestedDate || !time) {
      toast({
        title: "Missing details",
        description: "Customer name, date, and time are required.",
        variant: "destructive",
      });
      return;
    }

    await createRequest.mutateAsync({
      businessId,
      data: {
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

    void queryClient.invalidateQueries({
      queryKey: getListBusinessAppointmentRequestsQueryKey(businessId),
    });
    toast({ title: "Appointment added", description: "Saved as confirmed (phone or walk-in)." });
    resetForm();
    onOpenChange(false);
  }, [
    businessId,
    createRequest,
    customerEmail,
    customerName,
    customerPhone,
    notes,
    onOpenChange,
    productId,
    queryClient,
    requestedDate,
    requestedTime,
    serviceName,
    toast,
  ]);

  const { run: runSubmit, pending } = useAsyncAction(submit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Add appointment</DialogTitle>
          <DialogDescription>
            Record a phone or walk-in booking. It is saved as confirmed — no customer request email is sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="manual-name">Customer name</Label>
            <Input id="manual-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="manual-email">Email (optional)</Label>
              <Input id="manual-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="manual-phone">Phone (optional)</Label>
              <Input id="manual-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
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
              <Label htmlFor="manual-service">Service (optional)</Label>
              <Input id="manual-service" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="manual-date">Date</Label>
              <Input id="manual-date" type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="manual-time">Time</Label>
              <TimePicker id="manual-time" value={requestedTime} onChange={setRequestedTime} required />
            </div>
          </div>
          <div>
            <Label htmlFor="manual-notes">Notes (optional)</Label>
            <Textarea id="manual-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <LoadingButton onClick={() => void runSubmit()} loading={pending} loadingText="Saving…">
            Save appointment
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
