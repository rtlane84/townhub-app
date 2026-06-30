import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useListSubscriptionPlans } from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Building2, User, Calendar, Layers, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { planAssignmentLabel } from "@/lib/subscription-plans";
import { BusinessHoursDisplay } from "@/components/business-hours-display";
import type { BusinessDayHours } from "@workspace/api-client-react";

interface Application {
  id: number;
  userId: string;
  userEmail: string | null;
  name: string;
  type: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  hours: string | null;
  structuredHours: BusinessDayHours[] | null;
  planId: number | null;
  planName: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  reviewedAt: string | null;
  businessId: number | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function useApplications(getToken: () => Promise<string | null>) {
  return useQuery<Application[]>({
    queryKey: ["admin", "applications"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/applications", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load applications");
      return res.json() as Promise<Application[]>;
    },
  });
}

export default function AdminApplications() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [rejectDialog, setRejectDialog] = useState<{ id: number; name: string } | null>(null);
  const [approveDialog, setApproveDialog] = useState<Application | null>(null);
  const [approvePlanId, setApprovePlanId] = useState<string>("");
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const { data: applications, isLoading } = useApplications(getToken);
  const { data: plans = [] } = useListSubscriptionPlans({});

  async function safeJson(res: Response): Promise<Record<string, unknown>> {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return res.json() as Promise<Record<string, unknown>>;
    }
    return { error: `Server error (${res.status})` };
  }

  function openApproveDialog(app: Application) {
    const defaultPlan =
      app.planId != null
        ? String(app.planId)
        : plans.find((p) => p.isDefault && p.isActive)?.id != null
          ? String(plans.find((p) => p.isDefault && p.isActive)!.id)
          : "";
    setApprovePlanId(defaultPlan);
    setApproveDialog(app);
  }

  async function handleApprove() {
    if (!approveDialog || actionLoading !== null) return;
    const id = approveDialog.id;
    setActionLoading(id);
    try {
      const token = await getToken();
      const body: { planId?: number } = {};
      if (approvePlanId) {
        body.planId = parseInt(approvePlanId, 10);
      }
      const res = await fetch(`/api/admin/applications/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const resBody = await safeJson(res);
      if (!res.ok) {
        toast({ title: "Approval failed", description: String(resBody.error ?? "Failed to approve"), variant: "destructive" });
        return;
      }
      toast({ title: "Application approved", description: String(resBody.message ?? "Business created successfully.") });
      setApproveDialog(null);
      setApprovePlanId("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
    } catch (err) {
      toast({ title: "Network error", description: "Could not reach the server. Please try again.", variant: "destructive" });
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectDialog || actionLoading !== null) return;
    setActionLoading(rejectDialog.id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/applications/${rejectDialog.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ note: rejectNote }),
      });
      const body = await safeJson(res);
      if (!res.ok) {
        toast({ title: "Error", description: String(body.error ?? "Failed to reject"), variant: "destructive" });
        return;
      }
      toast({ title: "Application rejected", description: String(body.message ?? "") });
      setRejectDialog(null);
      setRejectNote("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
    } catch (err) {
      toast({ title: "Network error", description: "Could not reach the server. Please try again.", variant: "destructive" });
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = (applications ?? []).filter(
    (a) => filter === "ALL" || a.status === filter,
  );

  const counts = {
    ALL: applications?.length ?? 0,
    PENDING: applications?.filter((a) => a.status === "PENDING").length ?? 0,
    APPROVED: applications?.filter((a) => a.status === "APPROVED").length ?? 0,
    REJECTED: applications?.filter((a) => a.status === "REJECTED").length ?? 0,
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-serif text-2xl font-bold">Business Applications</h1>
          <p className="text-muted-foreground mt-1">Review and manage listing requests from business owners.</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["PENDING", "ALL", "APPROVED", "REJECTED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              <span className="ml-1.5 text-xs opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No {filter === "ALL" ? "" : filter.toLowerCase() + " "}applications</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === "PENDING"
                  ? "No applications waiting for review."
                  : "Applications will appear here as they come in."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Application cards */}
        <div className="space-y-4">
          {filtered.map((app) => (
            <Card key={app.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{app.name}</h3>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full border font-medium",
                              STATUS_COLORS[app.status],
                            )}
                          >
                            {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{app.type}</p>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{app.userEmail ?? app.userId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>Applied {formatDate(app.createdAt)}</span>
                      </div>
                      {app.planName ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Layers className="h-3.5 w-3.5 shrink-0" />
                          <span>Plan: <strong className="text-foreground">{app.planName}</strong></span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Layers className="h-3.5 w-3.5 shrink-0" />
                          <span>No plan selected — default will apply if set</span>
                        </div>
                      )}
                      {app.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{app.address}</span>
                        </div>
                      )}
                    </div>

                    {app.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{app.description}</p>
                    )}

                    {(app.structuredHours?.length || app.hours) && (
                      <div className="rounded-lg bg-muted/40 px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Hours</p>
                        <BusinessHoursDisplay
                          structuredHours={app.structuredHours}
                          fallbackHours={app.hours}
                          compact
                        />
                      </div>
                    )}

                    {app.reviewNote && (
                      <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                        <span className="font-medium">Review note: </span>
                        {app.reviewNote}
                      </div>
                    )}

                    {app.status === "APPROVED" && app.businessId && (
                      <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                        Business #{app.businessId} created
                      </Badge>
                    )}
                  </div>

                  {/* Action buttons */}
                  {app.status === "PENDING" && (
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <LoadingButton
                        size="sm"
                        onClick={() => openApproveDialog(app)}
                        loading={actionLoading === app.id}
                        loadingText="Approving…"
                        disabled={actionLoading !== null}
                        className="flex-1 sm:flex-none"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve
                      </LoadingButton>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setRejectDialog({ id: app.id, name: app.name }); setRejectNote(""); }}
                        disabled={actionLoading !== null}
                        className="flex-1 sm:flex-none text-destructive border-destructive/30 hover:bg-destructive/5"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Approve dialog */}
      <Dialog open={!!approveDialog} onOpenChange={(o) => { if (!o) { setApproveDialog(null); setApprovePlanId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Approve <strong>{approveDialog?.name}</strong> and create their business listing.
          </p>
          <div className="space-y-2">
            <Label htmlFor="approve-plan">Subscription plan</Label>
            <Select value={approvePlanId || "__default__"} onValueChange={(v) => setApprovePlanId(v === "__default__" ? "" : v)}>
              <SelectTrigger id="approve-plan">
                <SelectValue placeholder="Use applicant or default plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">
                  {approveDialog?.planName
                    ? `Applicant choice: ${approveDialog.planName}`
                    : "Default active plan (if configured)"}
                </SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {planAssignmentLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Override with any plan, including inactive or internal plans. Leave on the first option to use the applicant&apos;s selection or platform default.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveDialog(null); setApprovePlanId(""); }}>Cancel</Button>
            <LoadingButton
              onClick={() => void handleApprove()}
              loading={actionLoading === approveDialog?.id}
              loadingText="Approving…"
              disabled={actionLoading !== null && actionLoading !== approveDialog?.id}
            >
              Approve & Create Business
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => { if (!o) setRejectDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting <strong>{rejectDialog?.name}</strong>. The applicant may reapply.
          </p>
          <div className="space-y-2">
            <Label htmlFor="note">Reason (optional)</Label>
            <Textarea
              id="note"
              placeholder="e.g. Incomplete information, duplicate listing…"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <LoadingButton
              variant="destructive"
              onClick={() => void handleReject()}
              loading={actionLoading === rejectDialog?.id}
              loadingText="Rejecting…"
              disabled={actionLoading !== null && actionLoading !== rejectDialog?.id}
            >
              Reject Application
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}
