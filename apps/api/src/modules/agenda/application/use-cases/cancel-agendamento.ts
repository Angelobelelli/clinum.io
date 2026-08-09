import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';
import { CallerMember } from '@/modules/agenda/application/policies/agenda-ownership-policy';
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

    return right({ agendamento: updatedAgendamento });
  }
}
