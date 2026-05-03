import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import { myEnvironment } from "../configs/env.config";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaMariaDb({
  host: myEnvironment.DB_HOST,
  port: 3306,
  user: myEnvironment.DB_USER,
  password: myEnvironment.DB_PASSWORD,
  database: myEnvironment.DB_NAME,
  connectionLimit: 5,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (myEnvironment.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}