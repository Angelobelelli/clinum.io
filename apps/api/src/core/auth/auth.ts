import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import { prismaClient } from '../database/prisma-client';
import { ac, admin, member, owner, reception, staff } from './access-control';

/**
 * Instância única do better-auth, usada tanto pela aplicação (montada em
 * /api/auth/*, ver auth.controller.ts) quanto pelo CLI do better-auth para
 * gerar o schema do Prisma:
 *
 *   pnpm exec better-auth generate --config src/core/auth/auth.ts
 */
export const auth = betterAuth({
  database: prismaAdapter(prismaClient, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  // Cada Organization pode ter seu próprio subdomínio (slug) ou domínio
  // customizado (customDomain) — ambos precisam ser aceitos como origem
  // confiável para cookies/CSRF. Lista estática por enquanto; validar
  // customDomain dinamicamente contra o banco fica para quando o proxy
  // de domínio for implementado.
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      ac,
      roles: {
        owner,
        admin,
        member,
        staff,
        reception,
      },
      schema: {
        organization: {
          additionalFields: {
            // Domínio próprio do cliente (ex: www.clinicaabc.com.br).
            // O slug (gerado pelo plugin) já cobre o subdomínio automático
            // (ex: clinicabemestar.dominio-do-saas.com.br).
            customDomain: {
              type: 'string',
              required: false,
              unique: true,
              input: true,
            },
            vertical: {
              type: 'string',
              required: false,
              defaultValue: 'clinica_medica',
              input: true,
            },
            plano: {
              type: 'string',
              required: false,
              defaultValue: 'basico',
              input: true,
            },
          },
        },
      },
    }),
  ],
});
