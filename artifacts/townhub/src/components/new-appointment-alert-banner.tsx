import { Bell, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePendingAppointmentNotification } from "@/hooks/order-dashboard-refresh-context";
import { appointmentBannerDetails, appointmentBannerHeadline } from "@/lib/appointment-alert-format";
import { useLocation } from "wouter";
import { BUSINESS_HUB_APPOINTMENTS_PATH } from "@/lib/business-hub-notification-manager";

export function NewAppointmentAlertBanner() {
  const [, setLocation] = useLocation();
  const { notification, clearNotification } = usePendingAppointmentNotification();

  if (!notification?.requests.length) return null;

  const latest = notification.requests[0]!;
  const totalCount = notification.requests.length;
  const multiple = totalCount > 1;

  const openAppointments = () => {
    setLocation(BUSINESS_HUB_APPOINTMENTS_PATH);
    clearNotification();
  };

  return (
    <div
      className="mb-6 rounded-xl border-2 border-primary/40 bg-primary/10 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
      role="alert"
      aria-live="polite"
      data-testid="new-appointment-alert-banner"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bell className="h-4 w-4" aria-hidden />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-semibold text-sm text-foreground">
            {appointmentBannerHeadline(latest, totalCount)}
          </p>
          {!multiple ? (
            <p className="text-sm text-muted-foreground truncate">
              {appointmentBannerDetails(latest)}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              size="sm"
              className="h-8"
              data-testid="new-appointment-banner-view"
              onClick={openAppointments}
            >
              {multiple ? "View Appointments" : "Open Appointments"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss new appointment alert"
          data-testid="new-appointment-banner-dismiss"
          onClick={clearNotification}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
