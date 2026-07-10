import { useState } from "react";
import {
  useListEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  getListEventsQueryKey,
} from "@workspace/api-client-react";
import type { Event, EventInput } from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { formatEventSchedule } from "@/lib/event-dates";
import { ImageField } from "@/components/image-field";
import { TimeRangePicker, coerceFormTime } from "@/components/time-picker";
import { isEndTimeAfterStart, normalizeOptionalTime } from "@workspace/api-zod";

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
  const { data: events = [], isLoading } = useListEvents({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<EventInput>({ ...BLANK });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });

  const createEvent = useCreateEvent({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Event created" }); setOpen(false); },
      onError: () => toast({ title: "Failed to create event", variant: "destructive" }),
    },
  });

  const updateEvent = useUpdateEvent({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Event updated" }); setOpen(false); },
      onError: () => toast({ title: "Failed to update event", variant: "destructive" }),
    },
  });

  const deleteEvent = useDeleteEvent({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Event deleted" }); setDeleteId(null); },
      onError: () => toast({ title: "Failed to delete event", variant: "destructive" }),
    },
  });

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

  const pending = createEvent.isPending || updateEvent.isPending;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground mt-1">Manage the community events calendar</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Event
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No events yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="divide-y">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium">{ev.title}</span>
                        {ev.featured && <Badge variant="secondary">Featured</Badge>}
                        {!ev.active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatEventSchedule(ev)}
                        {ev.location ? ` · ${ev.location}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(ev.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title *</label>
              <Input value={form.title} onChange={f("title")} placeholder="Summer Farmers Market" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Start Date *</label>
                <Input type="date" value={form.date} onChange={f("date")} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">End Date</label>
                <Input type="date" value={form.endDate ?? ""} onChange={f("endDate")} min={form.date || undefined} />
                <p className="text-xs text-muted-foreground mt-1">Optional — leave blank for single-day events</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type</label>
              <Select value={form.eventType} onValueChange={(v) => setForm((p) => ({ ...p, eventType: v as EventTypeValue }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
              <label className="text-sm font-medium mb-1.5 block">Location</label>
              <Input value={form.location} onChange={f("location")} placeholder="Town Square" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={form.description} onChange={f("description")} rows={3} />
            </div>
            <ImageField
              surface="event"
              value={form.imageUrl ?? ""}
              onChange={(imageUrl) => setForm((p) => ({ ...p, imageUrl }))}
              testId="event-image"
            />
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium">Featured on homepage</label>
              <Switch checked={!!form.featured} onCheckedChange={(v) => setForm((p) => ({ ...p, featured: v }))} />
            </div>
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium">Active</label>
              <Switch checked={!!form.active} onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton onClick={handleSave} disabled={!form.title || !form.date} loading={pending} loadingText="Saving…">
              Save
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this event?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
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
    </AdminDashboardLayout>
  );
}
