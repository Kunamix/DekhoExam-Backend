import http from "http";
import app from "./app";
import logger from "./logger/winston.logger";
import { myEnvironment } from "@/configs";
import { stopCronJobs } from "@/jobs";
import { prisma } from "./configs";


const PORT = myEnvironment.PORT || 8080;

const server = http.createServer(app);

/* -------------------- START SERVER -------------------- */
const startServer = async () => {
  try {
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port: ${myEnvironment.PORT}`);
      logger.info(`📑 Health check: http://localhost:${myEnvironment.PORT}/health`);
    });
  } catch (error) {
    logger.error("❌ Failed to start server", error);
    process.exit(1);
  }
};

startServer();

/* -------------------- GRACEFUL SHUTDOWN -------------------- */
let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  try {
    // 1. Stop accepting new requests
    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info("✅ HTTP server closed");
        resolve();
      });
    });

    // 2. Stop cron jobs
    stopCronJobs();
    logger.info("✅ Cron jobs stopped");

    // 3. Close database connections
    await prisma.$disconnect();
    logger.info("✅ Database disconnected");

    logger.info("👋 Shutdown complete. Exiting process.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error during shutdown", error);
    process.exit(1);
  }
};

/* -------------------- SIGNAL HANDLERS -------------------- */
process.on("SIGINT", shutdown);   // Ctrl + C
process.on("SIGTERM", shutdown);  // Docker / K8s
