import type { EventSubmitInput } from "@workspace/api-client-react";
import { useSubmitEvent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TimePicker } from "@/components/time-picker";
import {
  BLANK_EVENT_SUBMIT,
  buildEventSubmitPayload,
  validateEventSubmitForm,
  type EventSubmitField,
  type EventSubmitFieldErrors,
  type EventSubmitFormValues,
} from "@/lib/event-submit";
import { cn } from "@/lib/utils";
import { isNativeApp } from "@/lib/native-platform";
import { triggerNativeHaptic } from "@/lib/native-haptics";
import { useState } from "react";

const EVENT_TYPES = [
  { value: "COMMUNITY", label: "Community" },
  { value: "FOOD_TRUCK", label: "Food Truck" },
  { value: "SEASONAL", label: "Seasonal" },
  { value: "SALE", label: "Sale" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "MARKET", label: "Market" },
  { value: "OTHER", label: "Other" },
] as const;

type EventSubmitFormProps = {
  onCancel: () => void;
  onSubmitted?: () => void;
  className?: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function EventSubmitForm({ onCancel, onSubmitted, className }: EventSubmitFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<EventSubmitFormValues>({ ...BLANK_EVENT_SUBMIT });
  const [errors, setErrors] = useState<EventSubmitFieldErrors>({});
  const [attempted, setAttempted] = useState(false);

  const submitEvent = useSubmitEvent({
    mutation: {
      onSuccess: () => {
        if (isNativeApp()) triggerNativeHaptic("success");
        toast({
          title: "Submitted for review",
          description: "Thanks! An admin will review it before it appears publicly.",
        });
        setForm({ ...BLANK_EVENT_SUBMIT });
        setErrors({});
        setAttempted(false);
        onSubmitted?.();
      },
      onError: (error) => {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : "Please check the form and try again.";
        toast({
          title: "Couldn’t submit event",
          description: message,
          variant: "destructive",
        });
      },
    },
  });

  function patchField<K extends keyof EventSubmitFormValues>(
    field: K,
    value: EventSubmitFormValues[K],
  ) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (attempted) {
      setErrors(validateEventSubmitForm(next));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitEvent.isPending) return;

    setAttempted(true);
    const nextErrors = validateEventSubmitForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (isNativeApp()) triggerNativeHaptic("error");
      return;
    }

    const payload = buildEventSubmitPayload(form) as EventSubmitInput;
    submitEvent.mutate({ data: payload });
  }

  const inputErrorClass = (field: EventSubmitField) =>
    errors[field] ? "ring-2 ring-destructive/35 focus-visible:ring-destructive/45" : undefined;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative mb-8 min-w-0 overflow-x-hidden rounded-[1.5rem] border border-black/[0.08] bg-muted/40 shadow-sm",
        className,
      )}
      noValidate
      data-testid="event-submit-form"
    >
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h2 className="font-serif text-xl font-semibold text-platform-heading">
            Submit an event
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share a community happening. Submissions are reviewed before they appear publicly.
          </p>
        </div>

        <section className="space-y-3" aria-labelledby="event-details-heading">
          <SectionLabel>
            <span id="event-details-heading">Event details</span>
          </SectionLabel>
          <div className="min-w-0">
            <label htmlFor="event-title" className="mb-1 block text-sm font-medium">
              Event title <span className="text-destructive">*</span>
            </label>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) => patchField("title", e.target.value)}
              placeholder="Farmers Market"
              autoComplete="off"
              className={cn("h-11", inputErrorClass("title"))}
              aria-invalid={!!errors.title}
              data-testid="input-event-title"
            />
            <FieldError message={errors.title} />
          </div>
          <div className="min-w-0">
            <label htmlFor="event-type" className="mb-1 block text-sm font-medium">
              Category
            </label>
            <Select
              value={form.eventType}
              onValueChange={(v) =>
                patchField("eventType", v as EventSubmitFormValues["eventType"])
              }
            >
              <SelectTrigger id="event-type" className="h-11" data-testid="select-event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <label htmlFor="event-description" className="mb-1 block text-sm font-medium">
              Description
            </label>
            <Textarea
              id="event-description"
              value={form.description}
              onChange={(e) => patchField("description", e.target.value)}
              rows={3}
              placeholder="What should people know?"
              className="min-h-[5rem]"
              data-testid="input-event-description"
            />
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="event-datetime-heading">
          <SectionLabel>
            <span id="event-datetime-heading">Date & time</span>
          </SectionLabel>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="event-start-date" className="mb-1 block text-sm font-medium">
                Start date <span className="text-destructive">*</span>
              </label>
              <Input
                id="event-start-date"
                type="date"
                value={form.date}
                onChange={(e) => patchField("date", e.target.value)}
                className={cn("h-11", inputErrorClass("date"))}
                aria-invalid={!!errors.date}
                data-testid="input-event-start-date"
              />
              <FieldError message={errors.date} />
            </div>
            <div className="min-w-0">
              <label htmlFor="event-start-time" className="mb-1 block text-sm font-medium">
                Start time <span className="text-destructive">*</span>
              </label>
              <TimePicker
                id="event-start-time"
                value={form.startTime}
                onChange={(startTime) => patchField("startTime", startTime)}
                optional={false}
                required
                showFriendlyHint={false}
                error={errors.startTime}
                className={cn("h-11", inputErrorClass("startTime"))}
                data-testid="input-event-start-time"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="event-end-date" className="mb-1 block text-sm font-medium">
                End date <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="event-end-date"
                type="date"
                value={form.endDate}
                min={form.date || undefined}
                onChange={(e) => patchField("endDate", e.target.value)}
                className={cn("h-11", inputErrorClass("endDate"))}
                aria-invalid={!!errors.endDate}
                data-testid="input-event-end-date"
              />
              <FieldError message={errors.endDate} />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Leave blank for a single-day event.
              </p>
            </div>
            <div className="min-w-0">
              <label htmlFor="event-end-time" className="mb-1 block text-sm font-medium">
                End time <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <TimePicker
                id="event-end-time"
                value={form.endTime}
                onChange={(endTime) => patchField("endTime", endTime)}
                optional
                min={form.startTime || undefined}
                showFriendlyHint={false}
                error={errors.endTime}
                className={cn("h-11", inputErrorClass("endTime"))}
                data-testid="input-event-end-time"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Leave blank if the end time is unknown.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="event-location-heading">
          <SectionLabel>
            <span id="event-location-heading">Location</span>
          </SectionLabel>
          <div className="min-w-0">
            <label htmlFor="event-location" className="mb-1 block text-sm font-medium">
              Location <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="event-location"
              value={form.location}
              onChange={(e) => patchField("location", e.target.value)}
              placeholder="Town Square"
              className="h-11"
              data-testid="input-event-location"
            />
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="event-contact-heading">
          <SectionLabel>
            <span id="event-contact-heading">Contact</span>
          </SectionLabel>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="event-submitter-name" className="mb-1 block text-sm font-medium">
                Your name <span className="text-destructive">*</span>
              </label>
              <Input
                id="event-submitter-name"
                value={form.submitterName}
                onChange={(e) => patchField("submitterName", e.target.value)}
                autoComplete="name"
                className={cn("h-11", inputErrorClass("submitterName"))}
                aria-invalid={!!errors.submitterName}
                data-testid="input-event-submitter-name"
              />
              <FieldError message={errors.submitterName} />
            </div>
            <div className="min-w-0">
              <label htmlFor="event-submitter-email" className="mb-1 block text-sm font-medium">
                Your email <span className="text-destructive">*</span>
              </label>
              <Input
                id="event-submitter-email"
                type="email"
                inputMode="email"
                value={form.submitterEmail}
                onChange={(e) => patchField("submitterEmail", e.target.value)}
                autoComplete="email"
                className={cn("h-11", inputErrorClass("submitterEmail"))}
                aria-invalid={!!errors.submitterEmail}
                data-testid="input-event-submitter-email"
              />
              <FieldError message={errors.submitterEmail} />
            </div>
          </div>
        </section>

        {/* Honeypot — hidden from people, filled by some bots */}
        <div
          aria-hidden
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
        >
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => patchField("website", e.target.value)}
            />
          </label>
        </div>
      </div>

      <div
        className={cn(
          "sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-black/[0.06] bg-muted/95 px-4 py-3 backdrop-blur-md sm:px-6",
          "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          className="rounded-full"
          onClick={onCancel}
          disabled={submitEvent.isPending}
        >
          Cancel
        </Button>
        <LoadingButton
          type="submit"
          loading={submitEvent.isPending}
          loadingText="Submitting…"
          className="rounded-full"
          data-testid="button-submit-event"
        >
          Submit for Review
        </LoadingButton>
      </div>
    </form>
  );
}

/** Type re-export for callers that still touch EventSubmitInput */
export type { EventSubmitFormValues };
