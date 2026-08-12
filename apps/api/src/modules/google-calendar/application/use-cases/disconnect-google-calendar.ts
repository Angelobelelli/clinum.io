import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import { GoogleCalendarGateway } from '@/modules/google-calendar/application/ports/google-calendar-gateway';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';
import { GoogleCalendarNotConnectedError } from '@/modules/google-calendar/application/use-cases/errors/google-calendar-not-connected-error';

export interface DisconnectGoogleCalendarUseCaseRequest {
  memberId: string;
}

export type DisconnectGoogleCalendarUseCaseResponse = Either<
  GoogleCalendarNotConnectedError,
  Record<string, never>
>;

@Injectable()
export class DisconnectGoogleCalendarUseCase {
  constructor(
    private readonly connectionsRepository: GoogleCalendarConnectionsRepository,
    private readonly gateway: GoogleCalendarGateway,
  ) {}

  async execute({
    memberId,
  }: DisconnectGoogleCalendarUseCaseRequest): Promise<DisconnectGoogleCalendarUseCaseResponse> {
    const connection =
      await this.connectionsRepository.findByMemberId(memberId);
    if (!connection) {
      return left(new GoogleCalendarNotConnectedError());
    }

    // Best-effort — DECISÃO DE MODELAGEM: falha ao revogar/parar o canal no
    // lado do Google nunca impede remover o registro local. O profissional
    // está desconectando pela nossa UI; se o Google estiver instável, a
    // pior consequência é um canal órfão que expira sozinho em até 30 dias
    // (não um dado nosso preso por causa de uma falha de terceiro).
    if (connection.watchChannelId && connection.watchResourceId) {
      try {
        await this.gateway.stopWatchChannel({
          refreshToken: connection.refreshToken,
          channelId: connection.watchChannelId,
          resourceId: connection.watchResourceId,
        });
      } catch {
        // ignorado de propósito — ver comentário acima.
      }
    }

    try {
      await this.gateway.revokeAccess(connection.refreshToken);
    } catch {
      // ignorado de propósito — ver comentário acima.
    }

    await this.connectionsRepository.delete(connection.id.toValue());

    return right({});
  }
}
