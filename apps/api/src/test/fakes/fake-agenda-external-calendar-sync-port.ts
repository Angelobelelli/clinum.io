import {
  AgendaExternalCalendarSyncPort,
  EnqueueAgendaExternalSyncParams,
} from '@/modules/agenda/application/ports/agenda-external-calendar-sync';

/**
 * Fake em memória de AgendaExternalCalendarSyncPort — usado pelos specs de
 * create/update/cancel-agendamento (agenda/ não conhece a implementação
 * real de modules/google-calendar/). `busy`/`calls` são configuráveis pelo
 * teste para simular conflito externo e para inspecionar o que foi
 * enfileirado.
 */
export class FakeAgendaExternalCalendarSyncPort implements AgendaExternalCalendarSyncPort {
  public busy = false;
  public calls: EnqueueAgendaExternalSyncParams[] = [];

  checkFreeBusyConflict(): Promise<boolean> {
    return Promise.resolve(this.busy);
  }

  enqueueSync(params: EnqueueAgendaExternalSyncParams): Promise<void> {
    this.calls.push(params);
    return Promise.resolve();
  }
}
