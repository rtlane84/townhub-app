import { useGetPlatformStats } from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { usePlatformBranding } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, ShoppingBag, DollarSign, Activity } from "lucide-react";

export default function AdminOverview() {
  const { platformName } = usePlatformBranding();
  const { data: stats, isLoading } = useGetPlatformStats();

  const metrics = stats
    ? [
        { label: "Total Businesses", value: stats.totalBusinesses, icon: Store, color: "bg-primary/10 text-primary" },
        { label: "Active Businesses", value: stats.activeBusinesses, icon: Activity, color: "bg-green-100 text-green-700" },
        { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, color: "bg-blue-100 text-blue-700" },
        { label: "Total Revenue", value: `$${(stats.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: "bg-amber-100 text-amber-700" },
      ]
    : [];

  return (
    <AdminDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-bold">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">All activity across {platformName}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))
            : metrics.map((m) => (
                <Card key={m.label} data-testid={`stat-${m.label.toLowerCase().replace(/ /g, "-")}`}>
                  <CardContent className="p-6">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${m.color}`}>
                      <m.icon className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-serif font-bold">{m.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Welcome to the Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>Use the sidebar to manage businesses, view all platform orders, and assign user roles.</p>
            <p>All changes take effect immediately across the platform.</p>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
