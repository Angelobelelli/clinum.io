import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import {
  Agendamento,
  AgendamentoStatusValue,
} from '@/modules/agenda/enterprise/entities/agendamento';
import { CallerMember } from '@/modules/agenda/application/policies/agenda-ownership-policy';
import { AgendamentosRepository } from '@/modules/agenda/application/repositories/agendamentos-repository';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { findOwnedAgendamento } from '@/modules/agenda/application/use-cases/shared/find-owned-agendamento';

export interface UpdateAgendamentoStatusUseCaseRequest {
  agendamentoId: string;
  caller: CallerMember;
  status: Extract<AgendamentoStatusValue, 'realizado' | 'falta'>;
}

export type UpdateAgendamentoStatusUseCaseResponse = Either<
  | AgendamentoNotFoundError
  | NotOwnAgendamentoError
  | AgendamentoTerminalStateError,
  { agendamento: Agendamento }
>;

/**
 * Endpoint /agendamentos/:id/status é só pra marcar o desfecho de um
 * atendimento que já deveria ter acontecido — nunca "agendado"/
 * "confirmado" (ver update-agendamento-status.schema.ts) e nunca
 * "cancelado" (endpoint próprio, cancel-agendamento.ts).
 */
@Injectable()
export class UpdateAgendamentoStatusUseCase {
  constructor(
    private readonly agendamentosRepository: AgendamentosRepository,
  ) {}

  async execute(
    request: UpdateAgendamentoStatusUseCaseRequest,
  ): Promise<UpdateAgendamentoStatusUseCaseResponse> {
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

    agendamento.status = request.status;
    const updatedAgendamento =
      await this.agendamentosRepository.save(agendamento);

    return right({ agendamento: updatedAgendamento });
  }
}
