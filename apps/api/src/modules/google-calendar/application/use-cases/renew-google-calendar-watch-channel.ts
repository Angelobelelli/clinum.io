import { Injectable } from '@nestjs/common';
import { GoogleCalendarGateway } from '@/modules/google-calendar/application/ports/google-calendar-gateway';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';

export interface RenewGoogleCalendarWatchChannelUseCaseRequest {
  connectionId: string;
}

/**
 * Renova o canal de UMA conexão — precisa rodar dentro do contexto de
 * tenant da organização dona dela (ver
 * FindExpiringGoogleCalendarWatchChannelsUseCase para o porquê da
 * varredura cross-tenant ser um use-case separado).
 */
@Injectable()
export class RenewGoogleCalendarWatchChannelUseCase {
  constructor(
    private readonly connectionsRepository: GoogleCalendarConnectionsRepository,
    private readonly gateway: GoogleCalendarGateway,
  ) {}

  async execute({
    connectionId,
  }: RenewGoogleCalendarWatchChannelUseCaseRequest): Promise<void> {
    const connection = await this.connectionsRepository.findById(connectionId);
    if (!connection) {
      return;
    }

    const watch = await this.gateway.createWatchChannel({
      refreshToken: connection.refreshToken,
      calendarId: connection.calendarId,
    });

    connection.registrarCanalWatch({
      channelId: watch.channelId,
      channelToken: watch.channelToken,
      resourceId: watch.resourceId,
      expiresAt: watch.expiresAt,
    });

    await this.connectionsRepository.save(connection);
  }
}
