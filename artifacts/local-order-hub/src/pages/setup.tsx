import { useState } from "react";
import { useUser, useAuth, SignInButton } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Store, CheckCircle2, Loader2 } from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePlatformBranding } from "@/components/theme-provider";

export default function Setup() {
  const { platformName } = usePlatformBranding();
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const { data: me, isLoading: meLoading } = useGetMe({
    query: { enabled: !!isSignedIn, queryKey: getGetMeQueryKey() },
  });

  async function claimAdmin() {
    setStatus("loading");
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(body.error ?? "Something went wrong.");
        return;
      }
      setStatus("done");
      setMessage(body.message ?? "Admin access granted.");
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setTimeout(() => setLocation("/dashboard/admin"), 1500);
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  }

  const alreadyAdmin = me?.role === "ADMIN";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Store className="h-8 w-8 text-primary" />
            <span className="font-serif text-2xl font-bold text-primary">{platformName}</span>
          </div>
          <h1 className="font-serif text-3xl font-bold">Platform Setup</h1>
          <p className="text-muted-foreground mt-2">
            Claim admin access for this deployment. This only works once — when no admin exists yet.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Claim Admin Access
            </CardTitle>
            <CardDescription>
              Sign in and claim the platform admin role. Once an admin exists, this page is locked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isLoaded || meLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !isSignedIn ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">Sign in first to claim admin access.</p>
                <SignInButton mode="modal">
                  <Button className="w-full">Sign In</Button>
                </SignInButton>
              </div>
            ) : alreadyAdmin ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                <p className="font-medium">You already have admin access.</p>
                <Button onClick={() => setLocation("/dashboard/admin")} className="w-full">
                  Go to Admin Dashboard
                </Button>
              </div>
            ) : status === "done" ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                <p className="font-medium text-green-700">{message}</p>
                <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  Signed in as <strong className="text-foreground">{me?.email}</strong>
                </div>
                {status === "error" && (
                  <p className="text-sm text-destructive">{message}</p>
                )}
                <Button
                  className="w-full"
                  onClick={claimAdmin}
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Claiming…</>
                  ) : (
                    <><ShieldCheck className="h-4 w-4 mr-2" /> Claim Admin Access</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          After setup, use the Admin Dashboard to assign roles to business owners.
        </p>
      </div>
    </div>
  );
}
