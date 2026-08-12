import { Injectable, Logger } from '@nestjs/common';
import { EnqueueAgendaExternalSyncParams } from '@/modules/agenda/application/ports/agenda-external-calendar-sync';
import { AgendamentoExternalSyncTarget } from '@/modules/agenda/infra/google-calendar/agendamento-external-sync-target';
import { GoogleCalendarGateway } from '@/modules/google-calendar/application/ports/google-calendar-gateway';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';
import { GoogleCalendarConnection } from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';

/**
 * Executado pelo processor da fila (google-calendar-sync, ver
 * infra/queue/processors/) — nunca chamado de forma síncrona numa request
 * HTTP. Payload idêntico ao que AgendaExternalCalendarSyncPort.enqueueSync
 * recebe (ver modules/agenda/application/ports/), sem tradução.
 */
@Injectable()
export class SyncAgendamentoToGoogleUseCase {
  private readonly logger = new Logger(SyncAgendamentoToGoogleUseCase.name);

  constructor(
    private readonly connectionsRepository: GoogleCalendarConnectionsRepository,
    private readonly gateway: GoogleCalendarGateway,
    private readonly syncTarget: AgendamentoExternalSyncTarget,
  ) {}

  async execute(params: EnqueueAgendaExternalSyncParams): Promise<void> {
    if (
      params.previousProfissionalId &&
      params.previousProfissionalId !== params.profissionalId
    ) {
      await this.removeFromPreviousProfissional(
        params.agendamentoId,
        params.previousProfissionalId,
      );
    }

    const connection = await this.connectionsRepository.findByMemberId(
      params.profissionalId,
    );
    if (!connection) {
      return;
    }

    const agendamento = await this.syncTarget.findById(params.agendamentoId);
    if (!agendamento) {
      return;
    }

    if (params.type === 'cancel') {
      if (agendamento.googleEventId) {
        await this.gateway.deleteEvent({
          refreshToken: connection.refreshToken,
          calendarId: connection.calendarId,
          googleEventId: agendamento.googleEventId,
        });
      }
      return;
    }

    if (!params.snapshot) {
      this.logger.warn(
        `Job de sync do tipo "upsert" recebido sem snapshot para o agendamento ${params.agendamentoId} — ignorando.`,
      );
      return;
    }

    await this.upsert(
      connection,
      params.agendamentoId,
      agendamento.googleEventId,
      params.snapshot,
    );
  }

  private async removeFromPreviousProfissional(
    agendamentoId: string,
    previousProfissionalId: string,
  ): Promise<void> {
    const previousConnection = await this.connectionsRepository.findByMemberId(
      previousProfissionalId,
    );
    if (!previousConnection) {
      return;
    }

    const agendamento = await this.syncTarget.findById(agendamentoId);
    if (!agendamento?.googleEventId) {
      return;
    }

    await this.gateway.deleteEvent({
      refreshToken: previousConnection.refreshToken,
      calendarId: previousConnection.calendarId,
      googleEventId: agendamento.googleEventId,
    });
  }

  private async upsert(
    connection: GoogleCalendarConnection,
    agendamentoId: string,
    existingGoogleEventId: string | null | undefined,
    snapshot: NonNullable<EnqueueAgendaExternalSyncParams['snapshot']>,
  ): Promise<void> {
    const syncVersionIso = new Date().toISOString();

    const { googleEventId } = await this.gateway.upsertEvent({
      refreshToken: connection.refreshToken,
      calendarId: connection.calendarId,
      googleEventId: existingGoogleEventId ?? undefined,
      event: {
        summary: this.buildSummary(snapshot),
        description: snapshot.observacao ?? undefined,
        dataHoraInicio: snapshot.dataHoraInicio,
        dataHoraFim: snapshot.dataHoraFim,
        agendamentoId,
        syncVersionIso,
      },
    });

    await this.syncTarget.linkGoogleEvent({
      agendamentoId,
      googleEventId,
      syncedAt: new Date(syncVersionIso),
    });
  }

  private buildSummary(
    snapshot: NonNullable<EnqueueAgendaExternalSyncParams['snapshot']>,
  ): string {
    return snapshot.servicoNome
      ? `${snapshot.patientNome} — ${snapshot.servicoNome}`
      : snapshot.patientNome;
  }
}
