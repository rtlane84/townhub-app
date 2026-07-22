import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import businessLiveEventsRouter from "./business-live-events";
import businessesRouter from "./businesses";
import productsRouter from "./products";
import modifierGroupsRouter from "./modifier-groups";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import eventsRouter from "./events";
import highlightsRouter from "./highlights";
import subscriptionsRouter from "./subscriptions";
import applicationsRouter from "./applications";
import foodTruckRouter from "./food-truck";
import platformRouter from "./platform";
import weatherRouter from "./weather";
import geoRouter from "./geo";
import supportRouter from "./support";
import appointmentRequestsRouter from "./appointment-requests";
import notificationTestsRouter from "./notification-tests";
import devicesRouter from "./devices";
import mediaRouter from "./media";
import devRouter from "./dev";
import debugRouter from "./debug";
import stripeConnectRouter from "./stripe-connect";
import internalJobsRouter from "./internal-jobs";
import { requireAdmin } from "../middlewares/requireRole";

const router: IRouter = Router();

// Role guard: all /admin/* routes require ADMIN role.
// Exceptions:
// - GET /admin/settings/theme — public brand colors on unauthenticated pages
// - GET /admin/bootstrap-status — public first-run setup probe (handler enforces)
// - POST /admin/bootstrap — first-run setup when no ADMIN exists yet (handler enforces)
router.use("/admin", (req, res, next) => {
  if (req.method === "GET" && req.path === "/settings/theme") return next();
  if (req.method === "GET" && req.path === "/bootstrap-status") return next();
  if (req.method === "POST" && req.path === "/bootstrap") return next();
  return requireAdmin(req, res, next);
});

// Platform theme (includes public GET) — mount early, before routers that attach
// requireAdmin to all /admin/* paths (e.g. subscriptions).
router.use(platformRouter);
router.use(weatherRouter);
router.use(geoRouter);
router.use(supportRouter);

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(highlightsRouter);
router.use(subscriptionsRouter);
router.use(applicationsRouter);
router.use(foodTruckRouter);
router.use(appointmentRequestsRouter);
router.use(notificationTestsRouter);
router.use(devicesRouter);
router.use(mediaRouter);
router.use(devRouter);
if (process.env.NODE_ENV !== "production") {
  router.use(debugRouter);
}
router.use(businessLiveEventsRouter);
router.use(businessesRouter);
router.use(stripeConnectRouter);
router.use(internalJobsRouter);
router.use(productsRouter);
router.use(modifierGroupsRouter);
router.use(ordersRouter);
router.use(adminRouter);

export default router;
