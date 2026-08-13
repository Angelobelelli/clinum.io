import { Injectable, Logger } from '@nestjs/common';
import { AgendamentoExternalSyncTarget } from '@/modules/agenda/infra/google-calendar/agendamento-external-sync-target';
import { GoogleSyncTokenExpiredError } from '@/integrations/google-calendar/google-calendar-integration.types';
import {
  GoogleCalendarChangedEvent,
  GoogleCalendarChangesResult,
  GoogleCalendarGateway,
} from '@/modules/google-calendar/application/ports/google-calendar-gateway';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';
import { GoogleCalendarConnection } from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';

export interface ProcessGoogleCalendarWebhookNotificationUseCaseRequest {
  connectionId: string;
}

/**
 * Parte ASSÍNCRONA do webhook (ver AcknowledgeGoogleCalendarWebhookUseCase
 * para a parte síncrona) — busca as mudanças incrementais via syncToken e
 * reflete no Agendamento vinculado, com proteção contra eco.
 */
@Injectable()
export class ProcessGoogleCalendarWebhookNotificationUseCase {
  private readonly logger = new Logger(
    ProcessGoogleCalendarWebhookNotificationUseCase.name,
  );

  constructor(
    private readonly connectionsRepository: GoogleCalendarConnectionsRepository,
    private readonly gateway: GoogleCalendarGateway,
    private readonly syncTarget: AgendamentoExternalSyncTarget,
  ) {}

  async execute(
    request: ProcessGoogleCalendarWebhookNotificationUseCaseRequest,
  ): Promise<void> {
    const connection = await this.connectionsRepository.findById(
      request.connectionId,
    );
    // Conexão pode ter sido desconectada entre o enqueue e o processamento.
    if (!connection) {
      return;
    }

    const page = await this.fetchChanges(connection);

    for (const change of page.changes) {
      await this.processChange(change);
    }

    connection.atualizarSyncToken(page.nextSyncToken);
    await this.connectionsRepository.save(connection);
  }

  private async fetchChanges(
    connection: GoogleCalendarConnection,
  ): Promise<GoogleCalendarChangesResult> {
    try {
      return await this.gateway.listChanges({
        refreshToken: connection.refreshToken,
        calendarId: connection.calendarId,
        syncToken: connection.syncToken ?? undefined,
      });
    } catch (error) {
      if (!(error instanceof GoogleSyncTokenExpiredError)) {
        throw error;
      }

      // syncToken inválido/expirado: descarta e refaz o bootstrap. Não há
      // como reconciliar o delta perdido — só garantimos um syncToken
      // válido para os próximos eventos (mesma limitação documentada pela
      // própria API do Google).
      this.logger.warn(
        `syncToken expirado para a conexão ${connection.id.toValue()} — refazendo bootstrap.`,
      );
      return this.gateway.listChanges({
        refreshToken: connection.refreshToken,
        calendarId: connection.calendarId,
      });
    }
  }

  private async processChange(
    change: GoogleCalendarChangedEvent,
  ): Promise<void> {
    // Evento não foi criado por nós (sem extendedProperties.private) — fora
    // do escopo do sync Google→App (ver decisão de modelagem no resumo
    // final): só refletimos mudanças em eventos JÁ vinculados.
    if (!change.agendamentoId) {
      return;
    }

    const agendamento = await this.syncTarget.findByGoogleEventId(
      change.googleEventId,
    );
    if (!agendamento) {
      return;
    }

    // Proteção contra eco: `change.updatedIso` é o timestamp de última
    // modificação que o PRÓPRIO GOOGLE mantém para o evento — se ele não é
    // mais recente que o nosso último write (Agendamento.syncedAt,
    // registrado depois do Google confirmar esse write, ver
    // SyncAgendamentoToGoogleUseCase), esta notificação é sobre o nosso
    // próprio sync, não uma edição feita depois por fora. Comparar contra
    // um marcador estático gravado em extendedProperties (tentativa
    // anterior) não funcionava: editar horário/título não toca
    // extendedProperties, então o marcador nunca mudava entre o nosso
    // write e uma edição externa seguinte — a mudança externa nunca era
    // detectada.
    if (
      agendamento.syncedAt &&
      new Date(change.updatedIso) <= agendamento.syncedAt
    ) {
      return;
    }

    if (change.status === 'cancelled') {
      await this.syncTarget.applyExternalUpdate({
        agendamentoId: agendamento.id.toValue(),
        status: 'cancelado',
      });
      return;
    }

    await this.syncTarget.applyExternalUpdate({
      agendamentoId: agendamento.id.toValue(),
      dataHoraInicio: change.dataHoraInicio,
      dataHoraFim: change.dataHoraFim,
    });
  }
}
