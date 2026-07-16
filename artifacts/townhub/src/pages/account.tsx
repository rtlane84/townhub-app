import { useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyAccountDeletionRequestQueryKey,
  useCancelMyAccountDeletionRequest,
  useGetMyAccountDeletionRequest,
  useRequestMyAccountDeletion,
} from "@workspace/api-client-react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { useToast } from "@/hooks/use-toast";

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function Account() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState("");
  const requestQuery = useGetMyAccountDeletionRequest();
  const requestMutation = useRequestMyAccountDeletion();
  const cancelMutation = useCancelMyAccountDeletionRequest();
  const request = requestQuery.data?.request ?? null;
  const pending = request?.status === "REQUESTED";

  async function refreshRequest() {
    await queryClient.invalidateQueries({ queryKey: getGetMyAccountDeletionRequestQueryKey() });
  }

  async function submitDeletionRequest() {
    try {
      await requestMutation.mutateAsync({ data: { confirmation: "DELETE" } });
      setConfirmation("");
      await refreshRequest();
      toast({
        title: "Deletion requested",
        description: "We received your request and will keep you informed at your account email.",
      });
    } catch (error) {
      toast({
        title: "Could not request deletion",
        description: error instanceof Error ? error.message : "Please try again or contact support.",
        variant: "destructive",
      });
    }
  }

  async function cancelDeletionRequest() {
    try {
      await cancelMutation.mutateAsync();
      await refreshRequest();
      toast({ title: "Deletion request canceled" });
    } catch (error) {
      toast({
        title: "Could not cancel request",
        description: error instanceof Error ? error.message : "Please try again or contact support.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8 pb-28 sm:py-12">
      <div>
        <h1 className="font-serif text-3xl font-bold">Account</h1>
        <p className="mt-1 text-muted-foreground">
          {user?.primaryEmailAddress?.emailAddress
            ? `Manage TownHub account deletion for ${user.primaryEmailAddress.emailAddress}.`
            : "Manage TownHub account deletion."}
        </p>
      </div>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" /> Delete TownHub account
          </CardTitle>
          <CardDescription>
            Request deletion of your account and associated personal data. Records that must be kept
            for payment, tax, fraud prevention, dispute, or other legal obligations may be retained.
            Use Manage account in your profile menu to edit profile and security settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requestQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Checking request status…</p>
          ) : pending ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-medium">Deletion requested {formatDate(request.requestedAt)}</p>
                <p className="mt-1">
                  Processing is scheduled by {formatDate(request.scheduledFor)}. We will review owner,
                  order, and legally retained records and send updates to your account email.
                </p>
              </div>
              <LoadingButton
                variant="outline"
                loading={cancelMutation.isPending}
                loadingText="Canceling…"
                onClick={() => void cancelDeletionRequest()}
              >
                Cancel deletion request
              </LoadingButton>
            </div>
          ) : request?.status === "COMPLETED" ? (
            <div className="flex items-start gap-2 rounded-lg bg-muted p-4 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
              <p>This deletion request was completed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Requests are normally processed within 30 days. Active business ownership, customer
                orders, and subscription obligations are reviewed during processing. You can cancel
                while the request is pending.
              </p>
              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">Type DELETE to confirm</Label>
                <Input
                  id="delete-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <LoadingButton
                variant="destructive"
                loading={requestMutation.isPending}
                loadingText="Requesting…"
                disabled={confirmation !== "DELETE"}
                onClick={() => void submitDeletionRequest()}
              >
                Request account deletion
              </LoadingButton>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
