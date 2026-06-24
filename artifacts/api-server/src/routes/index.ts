import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import businessesRouter from "./businesses";
import productsRouter from "./products";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import eventsRouter from "./events";
import highlightsRouter from "./highlights";
import subscriptionsRouter from "./subscriptions";
import applicationsRouter from "./applications";
import foodTruckRouter from "./food-truck";
import platformRouter from "./platform";
import { requireAdmin } from "../middlewares/requireRole";

const router: IRouter = Router();

// Role guard: all /admin/* routes require ADMIN role.
// Exception: GET /admin/settings/theme is intentionally public (used to load brand
// colors on every page, including unauthenticated public pages).
router.use("/admin", (req, res, next) => {
  if (req.method === "GET" && req.path === "/settings/theme") return next();
  return requireAdmin(req, res, next);
});

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(highlightsRouter);
router.use(subscriptionsRouter);
router.use(applicationsRouter);
router.use(foodTruckRouter);
router.use(platformRouter);
router.use(businessesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(adminRouter);

export default router;
