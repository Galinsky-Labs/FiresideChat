import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const localDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/fireside_chat?schema=public";

function databaseUrl() {
  const configured = process.env.DATABASE_URL;

  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not configured");
  }

  return localDatabaseUrl;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: databaseUrl() });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Lazily constructed Prisma client. Importing this module never touches
 * DATABASE_URL, so `next build` succeeds without database configuration;
 * a missing URL in production only fails when a query is actually made.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
