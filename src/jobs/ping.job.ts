import cron, { ScheduledTask } from "node-cron";
import axios from "axios";
import { myEnvironment } from "@/configs/env.config";
import logger from "@/logger/winston.logger";

const HEALTH_CHECK_URL = myEnvironment.HEALTH_CHECK_URL as string;

let keepAliveTask: ScheduledTask | null = null;

export const startKeepAliveCron = () => {
  if (keepAliveTask) {
    logger.warn("[CRON] KeepAlive cron already running");
    return;
  }

  keepAliveTask = cron.schedule(
    "*/10 * * * *", // every 10 minutes
    async () => {
      try {
        await axios.get(HEALTH_CHECK_URL, { timeout: 5000 });
        logger.info("[CRON] Health check pinged");
      } catch (error) {
        logger.error("[CRON] Health check failed");
      }
    },
    {
      timezone: "UTC",
    }
  );

  keepAliveTask.start();
  logger.info("[CRON] KeepAlive cron started");
};

export const stopKeepAliveCron = () => {
  if (!keepAliveTask) return;

  keepAliveTask.stop();
  keepAliveTask = null;
  logger.info("[CRON] KeepAlive cron stopped");
};
