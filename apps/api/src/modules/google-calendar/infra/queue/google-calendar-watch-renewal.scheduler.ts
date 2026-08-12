import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  GOOGLE_CALENDAR_WATCH_RENEWAL_QUEUE,
  WATCH_RENEWAL_REPEATABLE_JOB_ID,
  WATCH_RENEWAL_SWEEP_JOB,
} from '@/modules/google-calendar/infra/queue/google-calendar-queue.constants';

/**
 * Registra o job repetível de renovação de canal no boot da aplicação —
 * repeatable job do BullMQ (via upsertJobScheduler — `Queue.add({repeat})`
 * foi removido no BullMQ 6) em vez de @nestjs/schedule (ver decisão de
 * modelagem no resumo final): evita uma segunda dependência de agendamento
 * e evita disparo duplicado em múltiplas instâncias da API, já que o
 * BullMQ resolve o job agendado uma vez pelo cluster de workers
 * compartilhado (Redis), não por instância.
 *
 * `jobSchedulerId` fixo faz o `upsertJobScheduler` ser idempotente entre
 * reboots — chamar de novo com o mesmo id atualiza o agendamento existente
 * em vez de duplicá-lo.
 */
@Injectable()
export class GoogleCalendarWatchRenewalScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(GOOGLE_CALENDAR_WATCH_RENEWAL_QUEUE)
    private readonly watchRenewalQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.watchRenewalQueue.upsertJobScheduler(
      WATCH_RENEWAL_REPEATABLE_JOB_ID,
      { pattern: '0 3 * * *' },
      { name: WATCH_RENEWAL_SWEEP_JOB },
    );
  }
}
