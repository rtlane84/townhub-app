import { useState } from "react";
import {
  useListUsers,
  useUpdateUserRole,
  useUpdateUserStatus,
  useGetMe,
  getListUsersQueryKey,
  getGetMeQueryKey,
  useListAccountDeletionRequests,
} from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  changeUserRoleCopy,
  disableUserCopy,
  enableUserCopy,
  type UserRole,
} from "@/lib/admin-user-management";
import {
  canChangeOwnAdminRole,
  canDisableUser,
} from "@/lib/admin-user-safeguards";

const ROLES = ["CUSTOMER", "BUSINESS_OWNER", "ADMIN"] as const;

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "text-muted-foreground",
  BUSINESS_OWNER: "text-primary",
  ADMIN: "text-destructive",
};

type PendingRoleChange = {
  userId: string;
  name?: string | null;
  email: string;
  currentRole: UserRole;
  newRole: UserRole;
};

type PendingStatusChange = {
  userId: string;
  name?: string | null;
  email: string;
  newStatus: "ACTIVE" | "DISABLED";
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);

  const { data: me } = useGetMe(undefined, {
    query: { queryKey: getGetMeQueryKey() },
  });
  const { data: users, isLoading } = useListUsers();
  const { data: deletionRequests = [], isLoading: deletionRequestsLoading } =
    useListAccountDeletionRequests();

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
  };

  const updateRole = useUpdateUserRole({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateUsers();
        setPendingRoleChange(null);
        setRoleDrafts((current) => {
          const next = { ...current };
          delete next[variables.id];
          return next;
        });
        toast({ title: "Role updated" });
      },
      onError: (error, variables) => {
        setRoleDrafts((current) => {
          const next = { ...current };
          delete next[variables.id];
          return next;
        });
        toast({
          title: "Failed to update role",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
      },
    },
  });

  const updateStatus = useUpdateUserStatus({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateUsers();
        setPendingStatusChange(null);
        toast({
          title: variables.data.status === "DISABLED" ? "User disabled" : "User re-enabled",
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to update user status",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
      },
    },
  });

  function handleRoleSelect(user: NonNullable<typeof users>[number], newRole: UserRole) {
    if (newRole === user.role) {
      setRoleDrafts((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      return;
    }

    if (
      me?.id &&
      !canChangeOwnAdminRole(me.id, user.id, user.role as UserRole, newRole)
    ) {
      toast({
        title: "Cannot change your own admin role",
        description: "Ask another admin to update your role.",
        variant: "destructive",
      });
      setRoleDrafts((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      return;
    }

    setRoleDrafts((current) => ({ ...current, [user.id]: newRole }));
    setPendingRoleChange({
      userId: user.id,
      name: user.name,
      email: user.email,
      currentRole: user.role as UserRole,
      newRole,
    });
  }

  function handleDisableClick(user: NonNullable<typeof users>[number]) {
    if (me?.id && !canDisableUser(me.id, user.id)) {
      toast({
        title: "Cannot disable your own account",
        variant: "destructive",
      });
      return;
    }

    setPendingStatusChange({
      userId: user.id,
      name: user.name,
      email: user.email,
      newStatus: "DISABLED",
    });
  }

  function handleEnableClick(user: NonNullable<typeof users>[number]) {
    setPendingStatusChange({
      userId: user.id,
      name: user.name,
      email: user.email,
      newStatus: "ACTIVE",
    });
  }

  function cancelRoleChange(userId?: string) {
    setPendingRoleChange(null);
    if (userId) {
      setRoleDrafts((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
    }
  }

  const roleDialogCopy = pendingRoleChange
    ? changeUserRoleCopy(
        { name: pendingRoleChange.name, email: pendingRoleChange.email },
        pendingRoleChange.currentRole,
        pendingRoleChange.newRole,
      )
    : null;

  const statusDialogCopy = pendingStatusChange
    ? pendingStatusChange.newStatus === "DISABLED"
      ? disableUserCopy({ name: pendingStatusChange.name, email: pendingStatusChange.email })
      : enableUserCopy({ name: pendingStatusChange.name, email: pendingStatusChange.email })
    : null;

  return (
    <AdminDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and account status. Users are disabled, not deleted, so history is preserved.
          </p>
        </div>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div>
              <h2 className="font-medium">Account deletion requests</h2>
              <p className="text-sm text-muted-foreground">
                Process pending requests with the operator runbook before their scheduled date.
                Completion is intentionally not a one-click action because identity, ownership,
                subscriptions, and legally retained records must be reconciled.
              </p>
            </div>
            {deletionRequestsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : deletionRequests.filter((request) => request.status === "REQUESTED").length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending deletion requests.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {deletionRequests
                  .filter((request) => request.status === "REQUESTED")
                  .map((request) => (
                    <div key={request.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{request.email}</p>
                        <p className="text-xs text-muted-foreground">{request.role.replaceAll("_", " ")}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <Badge variant="destructive">Pending deletion</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Process by {new Date(request.scheduledFor).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !users?.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-serif text-lg">No users yet</p>
                <p className="text-sm mt-1">Users appear here after they sign in for the first time.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => {
                  const selectedRole = roleDrafts[user.id] ?? user.role;
                  const isDisabled = user.status === "DISABLED";
                  const isSelf = me?.id === user.id;

                  return (
                    <div
                      key={user.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                      data-testid={`row-user-${user.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm truncate">{user.name ?? "—"}</p>
                          <Badge
                            variant={isDisabled ? "outline" : "secondary"}
                            className="text-xs"
                            data-testid={`badge-status-${user.id}`}
                          >
                            {isDisabled ? "Disabled" : "Active"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Select
                          value={selectedRole}
                          onValueChange={(val) => handleRoleSelect(user, val as UserRole)}
                          disabled={updateRole.isPending || isDisabled}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs" data-testid={`select-role-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r} className={ROLE_COLORS[r]}>
                                {r.replace(/_/g, " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {isDisabled ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleEnableClick(user)}
                            disabled={updateStatus.isPending}
                            data-testid={`button-enable-${user.id}`}
                          >
                            Re-enable
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDisableClick(user)}
                            disabled={updateStatus.isPending || isSelf}
                            data-testid={`button-disable-${user.id}`}
                          >
                            Disable
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmActionDialog
        open={pendingRoleChange != null}
        onOpenChange={(open) => {
          if (!open) cancelRoleChange(pendingRoleChange?.userId);
        }}
        copy={roleDialogCopy}
        onConfirm={() => {
          if (!pendingRoleChange) return;
          updateRole.mutate({
            id: pendingRoleChange.userId,
            data: { role: pendingRoleChange.newRole },
          });
        }}
        loading={updateRole.isPending}
        loadingText="Updating role…"
        disabled={!pendingRoleChange}
      />

      <ConfirmActionDialog
        open={pendingStatusChange != null}
        onOpenChange={(open) => {
          if (!open) setPendingStatusChange(null);
        }}
        copy={statusDialogCopy}
        onConfirm={() => {
          if (!pendingStatusChange) return;
          updateStatus.mutate({
            id: pendingStatusChange.userId,
            data: { status: pendingStatusChange.newStatus },
          });
        }}
        loading={updateStatus.isPending}
        loadingText={pendingStatusChange?.newStatus === "DISABLED" ? "Disabling user…" : "Re-enabling user…"}
        disabled={!pendingStatusChange}
      />
    </AdminDashboardLayout>
  );
}
