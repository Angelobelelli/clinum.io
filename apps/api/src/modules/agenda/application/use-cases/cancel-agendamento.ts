import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';
import { CallerMember } from '@/modules/agenda/application/policies/agenda-ownership-policy';
import { AgendaExternalCalendarSyncPort } from '@/modules/agenda/application/ports/agenda-external-calendar-sync';
import { AgendamentosRepository } from '@/modules/agenda/application/repositories/agendamentos-repository';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { findOwnedAgendamento } from '@/modules/agenda/application/use-cases/shared/find-owned-agendamento';

export interface CancelAgendamentoUseCaseRequest {
  agendamentoId: string;
  caller: CallerMember;
}

export type CancelAgendamentoUseCaseResponse = Either<
  | AgendamentoNotFoundError
  | NotOwnAgendamentoError
  | AgendamentoTerminalStateError,
  { agendamento: Agendamento }
>;

@Injectable()
export class CancelAgendamentoUseCase {
  constructor(
    private readonly agendamentosRepository: AgendamentosRepository,
    private readonly agendaExternalCalendarSyncPort: AgendaExternalCalendarSyncPort,
  ) {}

  async execute(
    request: CancelAgendamentoUseCaseRequest,
  ): Promise<CancelAgendamentoUseCaseResponse> {
    const found = await findOwnedAgendamento(
      this.agendamentosRepository,
      request.agendamentoId,
      request.caller,
    );
    if (found.isLeft()) {
      return left(found.value);
    }

    const agendamento = found.value;

    if (agendamento.isTerminal()) {
      return left(new AgendamentoTerminalStateError());
    }

    agendamento.status = 'cancelado';
    const updatedAgendamento =
      await this.agendamentosRepository.save(agendamento);

    // Assíncrono (fila, ver modules/google-calendar/) — no-op se o
    // profissional não tiver conexão ativa.
    await this.agendaExternalCalendarSyncPort.enqueueSync({
      agendamentoId: updatedAgendamento.id.toValue(),
      profissionalId: updatedAgendamento.profissionalId,
      type: 'cancel',
    });

    return right({ agendamento: updatedAgendamento });
  }
}
