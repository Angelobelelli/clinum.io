import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  APP_DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional().default(''),

  // Fila (BullMQ, ver infra/queue/queue.module.ts) — primeira vez que o
  // projeto lê Redis; já existia no .env.example (docker-compose) sem
  // nenhum código consumindo até a integração com Google Calendar.
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Integração Google Calendar (ver modules/google-calendar/ e
  // integrations/google-calendar/).
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  // URL pública (https) usada no calendar.events.watch() — precisa de um
  // túnel (ex: ngrok) em desenvolvimento, já que o Google precisa conseguir
  // alcançá-la para entregar notificações de webhook.
  GOOGLE_CALENDAR_WEBHOOK_URL: z.string().url(),
  // Base64 de exatamente 32 bytes — chave da criptografia simétrica dos
  // refresh tokens (ver core/crypto/token-cipher.ts). Validado no primeiro
  // uso, não aqui (Zod não decodifica base64 nativamente).
  GOOGLE_TOKEN_ENCRYPTION_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validado uma única vez, no carregamento deste módulo — falha cedo e alto
 * (erro Zod com TODAS as variáveis faltando/inválidas de uma vez) se o
 * ambiente estiver mal configurado, em vez de deixar prismaClient/auth.ts
 * travarem depois com um erro genérico do driver Postgres ou do better-auth.
 *
 * Não usa @nestjs/config: prisma-client.ts, tenant-scoped-prisma-client.ts e
 * auth.ts são singletons de módulo avaliados no `import` (antes de
 * NestFactory.create() rodar), não providers do Nest — um ConfigService só
 * validaria depois que esses singletons já teriam lido `process.env`
 * diretamente. Qualquer código que precise de env deve importar `env` daqui,
 * nunca ler `process.env` diretamente.
 */
export const env: Env = envSchema.parse(process.env);
