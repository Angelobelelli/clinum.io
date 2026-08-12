import { Injectable, Logger } from '@nestjs/common';
import { GoogleCalendarGateway } from '@/modules/google-calendar/application/ports/google-calendar-gateway';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';

export interface CheckFreeBusyConflictUseCaseRequest {
  profissionalId: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
}

export interface CheckFreeBusyConflictUseCaseResponse {
  conflict: boolean;
}

/**
 * Consumido por AgendaExternalCalendarSyncImpl (ver infra/agenda-bridge/),
 * a implementação real de AgendaExternalCalendarSyncPort.checkFreeBusyConflict.
 *
 * DECISÃO DE MODELAGEM (fail-open): se a chamada ao Google falhar (timeout,
 * instabilidade), retorna "sem conflito" em vez de propagar o erro —
 * indisponibilidade de um terceiro não deve travar a criação/remarcação de
 * Agendamento. Pode ser invertido para fail-closed se o negócio preferir
 * uma postura mais rígida.
 */
@Injectable()
export class CheckFreeBusyConflictUseCase {
  private readonly logger = new Logger(CheckFreeBusyConflictUseCase.name);

  constructor(
    private readonly connectionsRepository: GoogleCalendarConnectionsRepository,
    private readonly gateway: GoogleCalendarGateway,
  ) {}

  async execute(
    request: CheckFreeBusyConflictUseCaseRequest,
  ): Promise<CheckFreeBusyConflictUseCaseResponse> {
    const connection = await this.connectionsRepository.findByMemberId(
      request.profissionalId,
    );
    if (!connection) {
      return { conflict: false };
    }

    try {
      const conflict = await this.gateway.hasConflict({
        refreshToken: connection.refreshToken,
        calendarId: connection.calendarId,
        dataHoraInicio: request.dataHoraInicio,
        dataHoraFim: request.dataHoraFim,
      });
      return { conflict };
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar Free/Busy do Google para o profissional ${request.profissionalId}, seguindo fail-open (sem conflito): ${String(error)}`,
      );
      return { conflict: false };
    }
  }
}
