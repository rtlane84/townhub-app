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
import foodTruckRouter from "./food-truck";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(highlightsRouter);
router.use(subscriptionsRouter);
router.use(foodTruckRouter);
router.use(businessesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(adminRouter);

export default router;
