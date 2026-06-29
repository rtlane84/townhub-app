import { useMemo, useState } from "react";
import {
  useGetMyBusiness,
  useUpdateBusiness,
  useListFoodTruckLocations,
  useCreateFoodTruckLocation,
  useUpdateFoodTruckLocation,
  useDeleteFoodTruckLocation,
  getListFoodTruckLocationsQueryKey,
  getGetMyBusinessQueryKey,
} from "@workspace/api-client-react";
import type { FoodTruckLocation } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin, Truck } from "lucide-react";
import {
  BLANK_FOOD_TRUCK_LOCATION_FORM,
  buildFoodTruckLocationPayload,
  canSaveFoodTruckLocationForm,
  foodTruckLocationToFormValues,
  validateFoodTruckCoordinates,
  type FoodTruckLocationFormValues,
} from "@/lib/food-truck-location-form";
import { TimeRangePicker } from "@/components/time-picker";
import { formatTimeRange12h } from "@workspace/api-zod";

export default function BusinessLocations() {
  const { data: business, isLoading: bizLoading } = useGetMyBusiness();
  const { data: locations = [], isLoading: locLoading } = useListFoodTruckLocations(
    business?.id ?? 0,
    { query: { enabled: !!business?.id, queryKey: getListFoodTruckLocationsQueryKey(business?.id ?? 0) } },
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FoodTruckLocation | null>(null);
  const [initialForm, setInitialForm] = useState<FoodTruckLocationFormValues | null>(null);
  const [form, setForm] = useState<FoodTruckLocationFormValues>({ ...BLANK_FOOD_TRUCK_LOCATION_FORM });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const invalidateLocs = () => {
    if (business?.id) queryClient.invalidateQueries({ queryKey: getListFoodTruckLocationsQueryKey(business.id) });
  };

  const updateBusiness = useUpdateBusiness({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
        toast({ title: "Settings saved" });
      },
    },
  });

  const createLoc = useCreateFoodTruckLocation({
    mutation: {
      onSuccess: () => { invalidateLocs(); toast({ title: "Location added" }); setOpen(false); },
      onError: () => toast({ title: "Failed to add location", variant: "destructive" }),
    },
  });

  const updateLoc = useUpdateFoodTruckLocation({
    mutation: {
      onSuccess: () => { invalidateLocs(); toast({ title: "Location updated" }); setOpen(false); },
      onError: () => toast({ title: "Failed to update location", variant: "destructive" }),
    },
  });

  const deleteLoc = useDeleteFoodTruckLocation({
    mutation: {
      onSuccess: () => { invalidateLocs(); toast({ title: "Location deleted" }); setDeleteId(null); },
      onError: () => toast({ title: "Failed to delete location", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditing(null);
    setInitialForm(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({ ...BLANK_FOOD_TRUCK_LOCATION_FORM, locationDate: today });
    setOpen(true);
  }

  function openEdit(loc: FoodTruckLocation) {
    const values = foodTruckLocationToFormValues(loc);
    setEditing(loc);
    setInitialForm(values);
    setForm(values);
    setOpen(true);
  }

  function handleSave() {
    if (!business) return;
    const coordinateError = validateFoodTruckCoordinates(form.latitude, form.longitude);
    if (coordinateError) return;

    const data = buildFoodTruckLocationPayload(form, editing ? "update" : "create");
    if (editing) {
      updateLoc.mutate({ id: business.id, locationId: editing.id, data });
    } else {
      createLoc.mutate({ id: business.id, data });
    }
  }

  function f(key: keyof FoodTruckLocationFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  const pending = createLoc.isPending || updateLoc.isPending;
  const coordinateError = useMemo(
    () => validateFoodTruckCoordinates(form.latitude, form.longitude),
    [form.latitude, form.longitude],
  );
  const saveEnabled = useMemo(
    () => canSaveFoodTruckLocationForm(form, { editing: !!editing, initial: initialForm }),
    [form, editing, initialForm],
  );

  const today = new Date().toISOString().slice(0, 10);
  const upcomingLocs = locations.filter((l) => l.locationDate >= today && l.isActive);
  const pastLocs = locations.filter((l) => l.locationDate < today || !l.isActive);

  return (
    <BusinessDashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Food Truck Locations</h1>
          <p className="text-muted-foreground mt-1">Manage your mobile location schedule</p>
        </div>

        {bizLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : business && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" /> Food Truck Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Show location schedule on your storefront</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customers will see your upcoming locations on your page and the homepage
                  </p>
                </div>
                <Switch
                  checked={!!business.eventLocationEnabled}
                  onCheckedChange={(v) =>
                    updateBusiness.mutate({ id: business.id, data: { eventLocationEnabled: v } as never })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Location Schedule</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Add Location
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {locLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : locations.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>No locations scheduled yet.</p>
              </div>
            ) : (
              <>
                {upcomingLocs.length > 0 && (
                  <div>
                    <div className="px-6 py-2 bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Upcoming
                    </div>
                    {upcomingLocs.map((loc) => (
                      <div key={loc.id} className="flex items-center justify-between px-6 py-3 border-b hover:bg-muted/20">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{loc.locationName}</span>
                            {loc.locationDate === today && <Badge variant="default" className="text-xs">Today</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {loc.locationDate}
                            {formatTimeRange12h(loc.startTime, loc.endTime)
                              ? ` · ${formatTimeRange12h(loc.startTime, loc.endTime)}`
                              : ""}
                            {loc.address ? ` · ${loc.address}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(loc)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(loc.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {pastLocs.length > 0 && (
                  <div>
                    <div className="px-6 py-2 bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Past / Inactive
                    </div>
                    {pastLocs.map((loc) => (
                      <div key={loc.id} className="flex items-center justify-between px-6 py-3 border-b hover:bg-muted/20 opacity-60">
                        <div>
                          <span className="font-medium text-sm">{loc.locationName}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {loc.locationDate}
                            {formatTimeRange12h(loc.startTime, loc.endTime)
                              ? ` · ${formatTimeRange12h(loc.startTime, loc.endTime)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(loc)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(loc.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Location Name *</label>
              <Input value={form.locationName} onChange={f("locationName")} placeholder="Downtown Farmers Market" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date *</label>
              <Input type="date" value={form.locationDate} onChange={f("locationDate")} />
            </div>
            <TimeRangePicker
              startValue={form.startTime}
              endValue={form.endTime}
              onStartChange={(startTime) => setForm((prev) => ({ ...prev, startTime }))}
              onEndChange={(endTime) => setForm((prev) => ({ ...prev, endTime }))}
              startTestId="input-location-start-time"
              endTestId="input-location-end-time"
            />
            <div>
              <label className="text-sm font-medium mb-1.5 block">Address</label>
              <Input value={form.address} onChange={f("address")} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Latitude</label>
                <Input
                  value={form.latitude}
                  onChange={f("latitude")}
                  placeholder="40.7128"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Longitude</label>
                <Input
                  value={form.longitude}
                  onChange={f("longitude")}
                  placeholder="-74.0060"
                  inputMode="decimal"
                />
              </div>
            </div>
            {coordinateError ? (
              <p className="text-xs text-destructive -mt-2">{coordinateError}</p>
            ) : (
              <p className="text-xs text-muted-foreground -mt-2">
                Optional map coordinates. Addresses are geocoded automatically when coordinates are blank.
              </p>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes</label>
              <Input value={form.locationNotes} onChange={f("locationNotes")} placeholder="Look for the red tent!" />
            </div>
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium">Active</label>
              <Switch checked={!!form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={pending || !saveEnabled}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this location?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId !== null && deleteLoc.mutate({ id: business?.id ?? 0, locationId: deleteId })} disabled={deleteLoc.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessDashboardLayout>
  );
}
