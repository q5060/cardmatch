import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Cache the client on globalThis so warm Serverless instances reuse the
// same PrismaClient (and its underlying connection pool) instead of
// creating a new one on every request.
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

globalForPrisma.prisma = prisma;

export default prisma;
