import { useListBusinessAppointmentRequests, getListBusinessAppointmentRequestsQueryKey } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Phone, Mail } from "lucide-react";
import { formatTime12h } from "@workspace/api-zod";

export default function BusinessAppointments() {
  const { business, isLoading: businessLoading } = useSelectedBusiness();
  const { data: requests = [], isLoading } = useListBusinessAppointmentRequests(
    business?.id ?? 0,
    {
      query: {
        enabled: !!business?.id,
        queryKey: getListBusinessAppointmentRequestsQueryKey(business?.id ?? 0),
      },
    },
  );

  return (
    <BusinessDashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Appointment Requests</h1>
          <p className="text-muted-foreground mt-1">
            Incoming salon appointment requests from customers.
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {businessLoading || isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No appointment requests yet</p>
                <p className="text-sm mt-1">Requests from your storefront will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {requests.map((request) => (
                  <div key={request.id} className="p-4 space-y-2" data-testid={`appointment-request-${request.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{request.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.requestedDate} at {formatTime12h(request.requestedTime)}
                          {request.serviceName ? ` · ${request.serviceName}` : ""}
                        </p>
                      </div>
                      <Badge variant="secondary">{request.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {request.customerEmail && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" /> {request.customerEmail}
                        </span>
                      )}
                      {request.customerPhone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {request.customerPhone}
                        </span>
                      )}
                    </div>
                    {request.notes && (
                      <p className="text-sm bg-muted/40 rounded-md p-2">{request.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BusinessDashboardLayout>
  );
}
