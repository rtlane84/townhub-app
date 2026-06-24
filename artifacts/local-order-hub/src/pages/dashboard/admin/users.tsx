import {
  useListUsers,
  useUpdateUserRole,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const ROLES = ["CUSTOMER", "BUSINESS_OWNER", "ADMIN"] as const;

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "text-muted-foreground",
  BUSINESS_OWNER: "text-primary",
  ADMIN: "text-destructive",
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useListUsers();

  const updateRole = useUpdateUserRole({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Role updated" });
      },
      onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
    },
  });

  return (
    <AdminDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts and roles</p>
        </div>

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
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 px-4 py-3" data-testid={`row-user-${user.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="shrink-0">
                      <Select
                        defaultValue={user.role}
                        onValueChange={(val) => updateRole.mutate({ id: user.id, data: { role: val as never } })}
                        disabled={updateRole.isPending}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
