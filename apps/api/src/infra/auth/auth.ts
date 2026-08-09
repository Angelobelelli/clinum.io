import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin as adminPlugin, organization } from 'better-auth/plugins';
import { recordAdminAuditLog } from '@/infra/audit/admin-audit-log';
import { prismaClient } from '@/infra/database/prisma-client';
import { env } from '@/core/env/env';
import {
  ac,
  admin as orgAdmin,
  member,
  owner,
  reception,
  staff,
} from '@/infra/auth/access-control';
import { validateOrThrowApiError } from '@/infra/auth/dto/validate-or-throw-api-error';
import { validateMemberRole } from '@/infra/auth/dto/member-role.schema';
import { organizationVerticalPlanoSchema } from '@/infra/auth/dto/organization-vertical-plano.schema';
import {
  platformAc,
  platformSuperAdmin,
  platformUser,
} from '@/infra/auth/platform-access-control';
import { PLATFORM_SUPER_ADMIN_ROLE } from '@/infra/auth/platform-role';

/**
 * Instância única do better-auth, usada tanto pela aplicação (montada em
 * /api/auth/*, ver auth.controller.ts) quanto pelo CLI do better-auth para
 * gerar o schema do Prisma:
 *
 *   pnpm exec better-auth generate --config src/infra/auth/auth.ts
 */
export const auth = betterAuth({
  database: prismaAdapter(prismaClient, { provider: 'postgresql' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  // Cada Organization pode ter seu próprio subdomínio (slug) ou domínio
  // customizado (customDomain) — ambos precisam ser aceitos como origem
  // confiável para cookies/CSRF. Lista estática por enquanto; validar
  // customDomain dinamicamente contra o banco fica para quando o proxy
  // de domínio for implementado.
  trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    // O better-auth só habilita rate limit por padrão quando
    // NODE_ENV === 'production' (enabled: options.rateLimit?.enabled ??
    // isProduction). Precisa desse override explícito para valer também em
    // dev (testar manualmente via curl/Postman). Exceto em 'test': os specs
    // e2e criam vários usuários via /sign-up/email em sequência rápida (ver
    // test/*.e2e-spec.ts) e trombam com o customRule de 5 req/60s abaixo —
    // rate limit continua ativo em desenvolvimento e produção, só não em
    // execução automatizada de teste (ver vitest.config.e2e.ts, que seta
    // NODE_ENV=test).
    enabled: env.NODE_ENV !== 'test',
    // Regra global (aplica a qualquer rota de /api/auth/* que não tenha
    // uma regra específica abaixo em customRules). 100 req/60s é o
    // suficiente para uso normal (checagem de sessão, refresh, etc) sem
    // travar usuário legítimo.
    window: 60,
    max: 5,
    // Servidor único sempre ligado (não é serverless) ⇒ dá pra guardar o
    // contador direto no Postgres via Prisma, sem precisar de Redis.
    // Rode `pnpm exec better-auth generate --config src/infra/auth/auth.ts`
    // depois dessa mudança para criar o model `rateLimit` no schema.prisma,
    // e então gere/aplique a migration do Prisma normalmente.
    storage: 'database',
    customRules: {
      // Login: alvo clássico de brute force / credential stuffing.
      '/sign-in/email': { window: 60, max: 5 },

      // Cadastro: evita criação em massa de contas/organizações.
      '/sign-up/email': { window: 60, max: 5 },

      // Esqueci minha senha: limite baixo evita spam de e-mail e
      // enumeração de quais e-mails têm conta cadastrada.
      '/forget-password': { window: 60, max: 3 },
      '/reset-password': { window: 60, max: 5 },

      // Troca de e-mail: sensível, mas usada raramente por um mesmo usuário.
      '/change-email': { window: 60, max: 3 },

      // Aceitar convite de organização: token de convite não deveria
      // poder ser tentado (guessing) repetidamente.
      '/organization/accept-invitation': { window: 60, max: 10 },

      // Impersonation é uma ação de altíssimo privilégio (super_admin da
      // plataforma agindo como qualquer usuário) — limita tentativas por
      // minuto mesmo vindas de uma conta já autenticada como admin.
      '/admin/impersonate-user': { window: 60, max: 5 },
    },
  },

  // Hook de baixo nível do better-auth (não é específico de nenhum plugin).
  // Toda sessão de impersonation criada pelo plugin `admin` (ver abaixo) sai
  // do endpoint POST /api/auth/admin/impersonate-user com
  // `session.impersonatedBy` = id de quem está impersonificando. É o único
  // ponto do better-auth 1.4.21 onde dá pra interceptar esse evento (a
  // versão instalada não expõe um hook dedicado tipo `onImpersonate` no
  // plugin em si) — por isso registramos aqui, não dentro do plugins: [].
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          const impersonatedBy = (
            session as unknown as { impersonatedBy?: string }
          ).impersonatedBy;

          if (!impersonatedBy) {
            return;
          }

          await recordAdminAuditLog({
            adminUserId: impersonatedBy,
            action: 'impersonate',
            targetUserId: session.userId,
          });
        },
      },
    },
  },
  plugins: [
    organization({
      ac,
      roles: {
        owner,
        admin: orgAdmin,
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
      // vertical/plano (Organization) e role (Member) continuam String no
      // Prisma (ver nota no topo do schema.prisma) — a validação de valores
      // permitidos acontece aqui, nos hooks do próprio plugin, já que
      // create/update de organização e de papel de member passam pelas
      // rotas do better-auth, não por um controller Nest nosso.
      organizationHooks: {
        // Os 4 hooks abaixo são síncronos por dentro (só validam e lançam
        // se inválido), mas precisam declarar `async` porque é essa a
        // assinatura exigida pelo tipo de organizationHooks do better-auth
        // (Promise<...>) — por isso o require-await é desligado aqui.
        // eslint-disable-next-line @typescript-eslint/require-await
        beforeCreateOrganization: async ({ organization }) => {
          validateOrThrowApiError(organizationVerticalPlanoSchema, {
            vertical: organization.vertical as string | null | undefined,
            plano: organization.plano as string | null | undefined,
          });
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        beforeUpdateOrganization: async ({ organization }) => {
          validateOrThrowApiError(organizationVerticalPlanoSchema, {
            vertical: organization.vertical as string | null | undefined,
            plano: organization.plano as string | null | undefined,
          });
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        beforeAddMember: async ({ member: newMember }) => {
          validateMemberRole(newMember.role);
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        beforeUpdateMemberRole: async ({ newRole }) => {
          validateMemberRole(newRole);
        },
      },
    }),
    // Camada de acesso de PLATAFORMA (dono do SaaS) — cross-tenant,
    // COMPLETAMENTE separada do plugin `organization` acima. Não confundir
    // "admin" aqui (papel de plataforma) com o role "admin" do Member
    // dentro de uma organização — por isso o único valor especial que
    // reconhecemos é "super_admin" (ver PLATFORM_SUPER_ADMIN_ROLE), nunca
    // "admin".
    adminPlugin({
      defaultRole: 'user',
      adminRoles: [PLATFORM_SUPER_ADMIN_ROLE],
      ac: platformAc,
      roles: {
        user: platformUser,
        [PLATFORM_SUPER_ADMIN_ROLE]: platformSuperAdmin,
      },
      schema: {
        user: {
          fields: {
            // Renomeia o campo/coluna física no Prisma de "role" para
            // "platformRole", para que o schema.prisma nunca tenha uma
            // coluna genérica "role" que possa ser confundida com
            // Member.role. A API do better-auth em si (session.user.role,
            // auth.api.setRole, ...) continua chamando isso de "role" — ver
            // o comentário completo em ./platform-role.ts.
            role: 'platformRole',
          },
        },
      },
    }),
  ],
});
