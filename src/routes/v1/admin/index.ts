import { Router } from "express";
import authRoute from "./auth.route";
import dashboardRoute from "./dashboard.route";
import userRoute from "./user.route";
import categoryRoute from "./category.route";
import subjectRoute from "./subject.route";
import topicRoute from "./topic.route";
import questionRoute from "./question.route";
import testRoute from "./test.route";
import subscriptionRoute from "./subscription.route";
import paymentRoute from "./payment.route";
import reportRoute from "./report.route";
import auditRoute from "./audit.route";

const router = Router();

router.use("/auth", authRoute);
router.use("/dashboard", dashboardRoute);
router.use("/users", userRoute);
router.use("/categories", categoryRoute);
router.use("/subjects", subjectRoute);
router.use("/topics", topicRoute);
router.use("/questions", questionRoute);
router.use("/tests", testRoute);
router.use("/subscriptions", subscriptionRoute);
router.use("/payments", paymentRoute);
router.use("/reports", reportRoute);
router.use("/audit", auditRoute);

export default router;