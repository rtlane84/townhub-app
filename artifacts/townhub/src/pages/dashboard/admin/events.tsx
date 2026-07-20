import { useMemo, useState } from "react";
import {
  useListAdminEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useApproveEvent,
  useRejectEvent,
} from "@workspace/api-client-react";
import type { Event, EventInput, EventStatus } from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Calendar, Check, X } from "lucide-react";
import { formatEventSchedule } from "@/lib/event-dates";
import {
  EVENT_DESCRIPTION_CARD_HINT,
  EVENT_DESCRIPTION_CARD_MAX_LENGTH,
} from "@/lib/event-description";
import { ImageField } from "@/components/image-field";
import { TimeRangePicker, coerceFormTime } from "@/components/time-picker";
import { isEndTimeAfterStart, normalizeOptionalTime } from "@workspace/api-zod";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  { value: "COMMUNITY", label: "Community" },
  { value: "FOOD_TRUCK", label: "Food Truck" },
  { value: "SEASONAL", label: "Seasonal" },
  { value: "SALE", label: "Sale" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "MARKET", label: "Market" },
  { value: "OTHER", label: "Other" },
] as const;

type EventTypeValue = (typeof EVENT_TYPES)[number]["value"];

const STATUS_FILTERS: Array<{ value: "ALL" | EventStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const STATUS_BADGE: Record<EventStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

const BLANK: EventInput = {
  title: "",
  date: "",
  endDate: "",
  startTime: "",
  endTime: "",
  location: "",
  description: "",
  imageUrl: "",
  eventType: "COMMUNITY",
  featured: false,
  active: true,
};

export default function AdminEvents() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | EventStatus>("PENDING");
  const listParams = statusFilter === "ALL" ? undefined : { status: statusFilter };
  const { data: events = [], isLoading } = useListAdminEvents(listParams);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<EventInput>({ ...BLANK });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Event | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/events"] });
  };

  const createEvent = useCreateEvent({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Event created" });
        setOpen(false);
      },
      onError: () => toast({ title: "Failed to create event", variant: "destructive" }),
    },
  });

  const updateEvent = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Event updated" });
        setOpen(false);
      },
      onError: () => toast({ title: "Failed to update event", variant: "destructive" }),
    },
  });

  const deleteEvent = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Event deleted" });
        setDeleteId(null);
      },
      onError: () => toast({ title: "Failed to delete event", variant: "destructive" }),
    },
  });

  const approveEvent = useApproveEvent({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Event approved" });
      },
      onError: () => toast({ title: "Failed to approve event", variant: "destructive" }),
    },
  });

  const rejectEvent = useRejectEvent({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Event rejected" });
        setRejectTarget(null);
        setRejectNote("");
      },
      onError: () => toast({ title: "Failed to reject event", variant: "destructive" }),
    },
  });

  const pendingCount = useMemo(
    () => events.filter((ev) => ev.status === "PENDING").length,
    [events],
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK });
    setOpen(true);
  }

  function openEdit(e: Event) {
    setEditing(e);
    setForm({
      title: e.title,
      date: e.date,
      endDate: e.endDate ?? "",
      startTime: coerceFormTime(e.startTime),
      endTime: coerceFormTime(e.endTime),
      location: e.location ?? "",
      description: e.description ?? "",
      imageUrl: e.imageUrl ?? "",
      eventType: e.eventType as EventTypeValue,
      featured: e.featured,
      active: e.active,
    });
    setOpen(true);
  }

  function handleSave() {
    if (form.endDate && form.endDate < form.date) {
      toast({
        title: "End date must be on or after the start date",
        variant: "destructive",
      });
      return;
    }

    const startTime = normalizeOptionalTime(form.startTime);
    const endTime = normalizeOptionalTime(form.endTime);
    if (startTime && endTime && !isEndTimeAfterStart(startTime, endTime)) {
      toast({
        title: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    const data = {
      ...form,
      endDate: form.endDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      location: form.location || undefined,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
    };
    if (editing) {
      updateEvent.mutate({ id: editing.id, data });
    } else {
      createEvent.mutate({ data });
    }
  }

  function f(key: keyof EventInput) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  const saving = createEvent.isPending || updateEvent.isPending;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-bold">Events</h1>
            <p className="mt-1 text-muted-foreground">
              Review community submissions and manage the events calendar
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Event
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              size="sm"
              variant={statusFilter === filter.value ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
              {filter.value === "PENDING" && statusFilter === "PENDING" && pendingCount > 0
                ? ` (${pendingCount})`
                : ""}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Calendar className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p>
                  {statusFilter === "PENDING"
                    ? "No pending event submissions."
                    : "No events in this filter."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-col gap-3 px-6 py-4 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-medium">{ev.title}</span>
                        <Badge variant="outline" className={cn("border", STATUS_BADGE[ev.status])}>
                          {ev.status}
                        </Badge>
                        {ev.featured ? <Badge variant="secondary">Featured</Badge> : null}
                        {!ev.active ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatEventSchedule(ev)}
                        {ev.location ? ` · ${ev.location}` : ""}
                      </p>
                      {ev.submitterName || ev.submitterEmail ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted by {[ev.submitterName, ev.submitterEmail].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:ml-4">
                      {ev.status === "PENDING" ? (
                        <>
                          <LoadingButton
                            size="sm"
                            className="gap-1.5"
                            loading={approveEvent.isPending}
                            onClick={() => approveEvent.mutate({ id: ev.id })}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </LoadingButton>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => {
                              setRejectTarget(ev);
                              setRejectNote("");
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      ) : null}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(ev.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title *</label>
              <Input value={form.title} onChange={f("title")} placeholder="Summer Farmers Market" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium">Start Date *</label>
                <Input type="date" value={form.date} onChange={f("date")} className="h-11" />
              </div>
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={form.endDate ?? ""}
                  onChange={f("endDate")}
                  min={form.date || undefined}
                  className="h-11"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional — leave blank for single-day events
                </p>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Type</label>
              <Select
                value={form.eventType}
                onValueChange={(v) => setForm((p) => ({ ...p, eventType: v as EventTypeValue }))}
              >
                <SelectTrigger>
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
            <TimeRangePicker
              startValue={form.startTime ?? ""}
              endValue={form.endTime ?? ""}
              onStartChange={(startTime) => setForm((p) => ({ ...p, startTime }))}
              onEndChange={(endTime) => setForm((p) => ({ ...p, endTime }))}
              startTestId="input-event-start-time"
              endTestId="input-event-end-time"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Location</label>
              <Input value={form.location} onChange={f("location")} placeholder="Town Square" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={f("description")}
                rows={3}
                maxLength={EVENT_DESCRIPTION_CARD_MAX_LENGTH}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {EVENT_DESCRIPTION_CARD_HINT}
                {" · "}
                {(form.description ?? "").length}/{EVENT_DESCRIPTION_CARD_MAX_LENGTH}
              </p>
            </div>
            <ImageField
              surface="event"
              value={form.imageUrl ?? ""}
              onChange={(imageUrl) => setForm((p) => ({ ...p, imageUrl }))}
              testId="event-image"
            />
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium">Featured on homepage</label>
              <Switch
                checked={!!form.featured}
                onCheckedChange={(v) => setForm((p) => ({ ...p, featured: v }))}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium">Active</label>
              <Switch
                checked={!!form.active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              onClick={handleSave}
              disabled={!form.title || !form.date}
              loading={saving}
              loadingText="Saving…"
            >
              Save
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this event?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={() => deleteId !== null && deleteEvent.mutate({ id: deleteId })}
              loading={deleteEvent.isPending}
              loadingText="Deleting…"
            >
              Delete
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setRejectTarget(null);
            setRejectNote("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject “{rejectTarget?.title}”?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Note (optional)</label>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              placeholder="Reason for rejection"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              loading={rejectEvent.isPending}
              loadingText="Rejecting…"
              onClick={() => {
                if (!rejectTarget) return;
                rejectEvent.mutate({
                  id: rejectTarget.id,
                  data: rejectNote.trim() ? { note: rejectNote.trim() } : {},
                });
              }}
            >
              Reject
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}
