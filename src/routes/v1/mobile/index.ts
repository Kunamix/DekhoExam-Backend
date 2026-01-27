import { Router } from "express";
import authRoute from "./auth.route";
import profileRoute from "./profile.route";
import categoryRoute from "./category.route";
import testRoute from "./test.route";
import subscriptionRoute from "./subscription.route";
import paymentRoute from "./payment.route";
import notificationRoute from "./notification.route";

const router = Router();

router.use("/auth", authRoute);
router.use("/profile", profileRoute);
router.use("/categories", categoryRoute);
router.use("/tests", testRoute);
router.use("/subscriptions", subscriptionRoute);
router.use("/payments", paymentRoute);
router.use("/notifications", notificationRoute);

export default router;