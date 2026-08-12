import { Either, left, right } from '@/core/either';
import { makeAgendamento } from '@/test/factories/make-agendamento';
import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';
import { AgendamentoExternalSyncTarget } from '@/modules/agenda/infra/google-calendar/agendamento-external-sync-target';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';

/**
 * Fake em memória de AgendamentoExternalSyncTarget — usado pelos specs de
 * use-cases de modules/google-calendar/ que precisam ler/atualizar um
 * Agendamento sem depender do módulo agenda/ de verdade.
 */
export class FakeAgendamentoExternalSyncTarget implements AgendamentoExternalSyncTarget {
  public items: Agendamento[] = [];
  public linkCalls: {
    agendamentoId: string;
    googleEventId: string;
    syncedAt: Date;
  }[] = [];

  seed(
    override: Partial<Parameters<typeof makeAgendamento>[0]> = {},
  ): Agendamento {
    const agendamento = makeAgendamento(override);
    this.items.push(agendamento);
    return agendamento;
  }

  findById(agendamentoId: string): Promise<Agendamento | null> {
    const agendamento = this.items.find(
      (item) => item.id.toValue() === agendamentoId,
    );
    return Promise.resolve(agendamento ?? null);
  }

  findByGoogleEventId(googleEventId: string): Promise<Agendamento | null> {
    const agendamento = this.items.find(
      (item) => item.googleEventId === googleEventId,
    );
    return Promise.resolve(agendamento ?? null);
  }

  applyExternalUpdate(params: {
    agendamentoId: string;
    dataHoraInicio?: Date;
    dataHoraFim?: Date;
    status?: 'cancelado';
  }): Promise<
    Either<
      AgendamentoNotFoundError | AgendamentoTerminalStateError,
      { agendamento: Agendamento }
    >
  > {
    const agendamento = this.items.find(
      (item) => item.id.toValue() === params.agendamentoId,
    );
    if (!agendamento) {
      return Promise.resolve(left(new AgendamentoNotFoundError()));
    }
    if (agendamento.isTerminal()) {
      return Promise.resolve(left(new AgendamentoTerminalStateError()));
    }

    if (params.dataHoraInicio !== undefined)
      agendamento.dataHoraInicio = params.dataHoraInicio;
    if (params.dataHoraFim !== undefined)
      agendamento.dataHoraFim = params.dataHoraFim;
    if (params.status !== undefined) agendamento.status = params.status;

    return Promise.resolve(right({ agendamento }));
  }

  linkGoogleEvent(params: {
    agendamentoId: string;
    googleEventId: string;
    syncedAt: Date;
  }): Promise<void> {
    this.linkCalls.push(params);
    const agendamento = this.items.find(
      (item) => item.id.toValue() === params.agendamentoId,
    );
    agendamento?.registrarSyncGoogle(params.googleEventId, params.syncedAt);
    return Promise.resolve();
  }
}
