import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';
import { AgendamentosRepository } from '@/modules/agenda/application/repositories/agendamentos-repository';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';
import { AgendamentoExternalSyncTarget } from '@/modules/agenda/infra/google-calendar/agendamento-external-sync-target';

@Injectable()
export class AgendamentoExternalSyncTargetImpl extends AgendamentoExternalSyncTarget {
  constructor(private readonly agendamentosRepository: AgendamentosRepository) {
    super();
  }

  async findById(agendamentoId: string): Promise<Agendamento | null> {
    return this.agendamentosRepository.findById(agendamentoId);
  }

  async findByGoogleEventId(
    googleEventId: string,
  ): Promise<Agendamento | null> {
    return this.agendamentosRepository.findByGoogleEventId(googleEventId);
  }

  async applyExternalUpdate(params: {
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
    const agendamento = await this.agendamentosRepository.findById(
      params.agendamentoId,
    );
    if (!agendamento) {
      return left(new AgendamentoNotFoundError());
    }

    if (agendamento.isTerminal()) {
      return left(new AgendamentoTerminalStateError());
    }

    if (params.dataHoraInicio !== undefined) {
      agendamento.dataHoraInicio = params.dataHoraInicio;
    }
    if (params.dataHoraFim !== undefined) {
      agendamento.dataHoraFim = params.dataHoraFim;
    }
    if (params.status !== undefined) {
      agendamento.status = params.status;
    }

    const updated = await this.agendamentosRepository.save(agendamento);
    return right({ agendamento: updated });
  }

  async linkGoogleEvent(params: {
    agendamentoId: string;
    googleEventId: string;
    syncedAt: Date;
  }): Promise<void> {
    const agendamento = await this.agendamentosRepository.findById(
      params.agendamentoId,
    );
    if (!agendamento) {
      return;
    }

    agendamento.registrarSyncGoogle(params.googleEventId, params.syncedAt);
    await this.agendamentosRepository.save(agendamento);
  }
}
