import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import { GoogleCalendarQueueProducer } from '@/modules/google-calendar/application/ports/google-calendar-queue-producer';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';
import { InvalidWatchChannelTokenError } from '@/modules/google-calendar/application/use-cases/errors/invalid-watch-channel-token-error';
import { UnknownWatchChannelError } from '@/modules/google-calendar/application/use-cases/errors/unknown-watch-channel-error';

export interface AcknowledgeGoogleCalendarWebhookUseCaseRequest {
  watchChannelId: string;
  watchChannelToken: string | undefined;
  /** X-Goog-Resource-State: "sync" (handshake inicial) | "exists" | "not_exists". */
  resourceState: string;
}

export type AcknowledgeGoogleCalendarWebhookUseCaseResponse = Either<
  UnknownWatchChannelError | InvalidWatchChannelTokenError,
  { enqueued: boolean }
>;

/**
 * Parte SÍNCRONA do webhook (ver requisito 5): identifica a conexão e
 * autentica a notificação ANTES de responder ao Google — precisa ser
 * rápido e não pode esperar o processamento pesado (fetch de eventos +
 * reconciliação), que fica em
 * ProcessGoogleCalendarWebhookNotificationUseCase, disparado via fila.
 */
@Injectable()
export class AcknowledgeGoogleCalendarWebhookUseCase {
  constructor(
    private readonly connectionsRepository: GoogleCalendarConnectionsRepository,
    private readonly queueProducer: GoogleCalendarQueueProducer,
  ) {}

  async execute(
    request: AcknowledgeGoogleCalendarWebhookUseCaseRequest,
  ): Promise<AcknowledgeGoogleCalendarWebhookUseCaseResponse> {
    const connection = await this.connectionsRepository.findByWatchChannelId(
      request.watchChannelId,
    );
    if (!connection) {
      return left(new UnknownWatchChannelError());
    }

    if (connection.watchChannelToken !== request.watchChannelToken) {
      return left(new InvalidWatchChannelTokenError());
    }

    // "sync": mensagem de handshake que o Google manda uma vez, ao criar o
    // canal — nunca representa uma mudança real, nada a enfileirar.
    if (request.resourceState === 'sync') {
      return right({ enqueued: false });
    }

    await this.queueProducer.enqueueWebhookProcessing({
      organizationId: connection.organizationId,
      connectionId: connection.id.toValue(),
    });

    return right({ enqueued: true });
  }
}
