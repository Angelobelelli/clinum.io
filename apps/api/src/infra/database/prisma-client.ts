import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@generated/prisma/client';
import { env } from '@/core/env/env';

/**
 * Client Prisma "cru" (sem a extension de isolamento de tenant), usado por
 * quem precisa acessar tabelas que não são de negócio (ex: o adapter do
 * better-auth, que gerencia User/Session/Organization/Member diretamente).
 *
 * Para queries de negócio, prefira o client exportado por
 * `prisma-tenant.extension.ts` assim que ele existir.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prismaClient = new PrismaClient({ adapter });
