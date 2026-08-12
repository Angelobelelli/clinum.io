import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { env } from '@/core/env/env';

/**
 * Primeira introdução de fila (BullMQ) no projeto — Redis já estava
 * provisionado (docker-compose, env vars) sem nenhum código consumindo até
 * a integração com Google Calendar (ver modules/google-calendar/).
 *
 * @Global() para que qualquer módulo que registre suas próprias queues via
 * `BullModule.registerQueue(...)` (ver GoogleCalendarModule) não precise
 * reimportar isto — mesmo padrão de DatabaseModule.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          password: env.REDIS_PASSWORD || undefined,
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
