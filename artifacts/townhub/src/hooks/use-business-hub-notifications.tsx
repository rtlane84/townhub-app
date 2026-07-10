import { useCallback } from "react";
import { useLocation } from "wouter";
import type { AppointmentRequest, Order } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useOrderDashboardRefreshActions } from "@/hooks/order-dashboard-refresh-context";
import { getNotificationPreferences } from "@/lib/notification-preferences";
import { playNotificationSound, unlockNotificationSound } from "@/lib/notification-sounds";
import {
  orderAlertDescription,
  orderToastBody,
  orderToastMobileTitle,
  orderToastMobileTitleMultiple,
  orderToastTitle,
  orderToastTitleMultiple,
} from "@/lib/order-alert-format";
import {
  appointmentAlertDescription,
  appointmentToastBody,
  appointmentToastMobileTitle,
  appointmentToastMobileTitleMultiple,
  appointmentToastTitle,
  appointmentToastTitleMultiple,
} from "@/lib/appointment-alert-format";
import {
  BUSINESS_HUB_APPOINTMENTS_PATH,
  BUSINESS_HUB_ORDERS_PATH,
  OWNER_NOTIFICATION_TOAST_DURATION_MS,
  OWNER_NOTIFICATION_TOAST_LAYOUT,
  resolveOrderDetailPath,
  shouldShowAppointmentNotificationBanner,
  shouldShowOrderNotificationBanner,
} from "@/lib/business-hub-notification-manager";

function playAlertSound(businessId: number): void {
  const prefs = getNotificationPreferences(businessId);
  if (!prefs.soundsEnabled) return;
  unlockNotificationSound();
  playNotificationSound(prefs.volume);
}

export function useBusinessHubNotifications(businessId: number | undefined) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const {
    queueOrderNotificationBanner,
    clearOrderNotificationBanner,
    queueAppointmentNotificationBanner,
    clearAppointmentNotificationBanner,
  } = useOrderDashboardRefreshActions();

  const openOrder = useCallback(
    (orderId: number) => {
      setLocation(resolveOrderDetailPath(orderId));
    },
    [setLocation],
  );

  const openOrdersList = useCallback(() => {
    setLocation(BUSINESS_HUB_ORDERS_PATH);
  }, [setLocation]);

  const openAppointments = useCallback(() => {
    setLocation(BUSINESS_HUB_APPOINTMENTS_PATH);
  }, [setLocation]);

  const notifyNewOrders = useCallback(
    (orders: Order[]) => {
      if (!businessId || !orders.length) return;

      playAlertSound(businessId);

      const showBanner = shouldShowOrderNotificationBanner(location);

      if (orders.length === 1) {
        const order = orders[0]!;
        const handleOpen = () => {
          openOrder(order.id);
          if (showBanner) clearOrderNotificationBanner();
        };

        toast({
          duration: OWNER_NOTIFICATION_TOAST_DURATION_MS,
          notificationLayout: OWNER_NOTIFICATION_TOAST_LAYOUT,
          title: orderToastTitle(order),
          mobileTitle: orderToastMobileTitle(order),
          description: orderToastBody(order),
          className: "cursor-pointer",
          onToastClick: handleOpen,
          action: (
            <ToastAction altText="Open order" data-toast-action onClick={handleOpen}>
              Open Order
            </ToastAction>
          ),
        });
      } else {
        const latest = orders[orders.length - 1]!;
        const handleOpen = () => {
          openOrdersList();
          if (showBanner) clearOrderNotificationBanner();
        };

        toast({
          duration: OWNER_NOTIFICATION_TOAST_DURATION_MS,
          notificationLayout: OWNER_NOTIFICATION_TOAST_LAYOUT,
          title: orderToastTitleMultiple(orders.length),
          mobileTitle: orderToastMobileTitleMultiple(orders.length, latest),
          description: `Latest: ${orderAlertDescription(latest)}`,
          className: "cursor-pointer",
          onToastClick: handleOpen,
          action: (
            <ToastAction altText="View orders" data-toast-action onClick={handleOpen}>
              View Orders
            </ToastAction>
          ),
        });
      }

      if (showBanner) {
        queueOrderNotificationBanner(orders);
      }
    },
    [
      businessId,
      clearOrderNotificationBanner,
      location,
      openOrder,
      openOrdersList,
      queueOrderNotificationBanner,
      toast,
    ],
  );

  const notifyNewAppointments = useCallback(
    (requests: AppointmentRequest[]) => {
      if (!businessId || !requests.length) return;

      playAlertSound(businessId);

      const showBanner = shouldShowAppointmentNotificationBanner(location);

      if (requests.length === 1) {
        const request = requests[0]!;
        const handleOpen = () => {
          openAppointments();
          if (showBanner) clearAppointmentNotificationBanner();
        };

        toast({
          duration: OWNER_NOTIFICATION_TOAST_DURATION_MS,
          notificationLayout: OWNER_NOTIFICATION_TOAST_LAYOUT,
          title: appointmentToastTitle(request),
          mobileTitle: appointmentToastMobileTitle(request),
          description: appointmentToastBody(request),
          className: "cursor-pointer",
          onToastClick: handleOpen,
          action: (
            <ToastAction altText="Open appointments" data-toast-action onClick={handleOpen}>
              Open Appointments
            </ToastAction>
          ),
        });
      } else {
        const latest = requests[requests.length - 1]!;
        const handleOpen = () => {
          openAppointments();
          if (showBanner) clearAppointmentNotificationBanner();
        };

        toast({
          duration: OWNER_NOTIFICATION_TOAST_DURATION_MS,
          notificationLayout: OWNER_NOTIFICATION_TOAST_LAYOUT,
          title: appointmentToastTitleMultiple(requests.length),
          mobileTitle: appointmentToastMobileTitleMultiple(requests.length, latest),
          description: `Latest: ${appointmentAlertDescription(latest)}`,
          className: "cursor-pointer",
          onToastClick: handleOpen,
          action: (
            <ToastAction altText="View appointments" data-toast-action onClick={handleOpen}>
              View Appointments
            </ToastAction>
          ),
        });
      }

      if (showBanner) {
        queueAppointmentNotificationBanner(requests);
      }
    },
    [
      businessId,
      clearAppointmentNotificationBanner,
      location,
      openAppointments,
      queueAppointmentNotificationBanner,
      toast,
    ],
  );

  return {
    notifyNewOrders,
    notifyNewAppointments,
  };
}
