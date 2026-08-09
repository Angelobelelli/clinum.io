import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import {
  Agendamento,
  AgendamentoStatusValue,
} from '@/modules/agenda/enterprise/entities/agendamento';
import { AgendamentoAuditLog } from '@/modules/agenda/enterprise/entities/agendamento-audit-log';
import { encontrarConflitoDeHorario } from '@/modules/agenda/enterprise/check-agendamento-overlap';
import { CallerMember } from '@/modules/agenda/application/policies/agenda-ownership-policy';
import { AgendamentoAuditLogsRepository } from '@/modules/agenda/application/repositories/agendamento-audit-logs-repository';
import { AgendamentosRepository } from '@/modules/agenda/application/repositories/agendamentos-repository';
import { AgendamentoConflictError } from '@/modules/agenda/application/use-cases/errors/agendamento-conflict-error';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoNotTerminalError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-terminal-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { findOwnedAgendamento } from '@/modules/agenda/application/use-cases/shared/find-owned-agendamento';
import { toAgendamentoExistente } from '@/modules/agenda/application/use-cases/shared/to-agendamento-existente';

// organizationId placeholder: ver mesmo padrão em create-agendamento.ts.
const ORGANIZATION_ID_PLACEHOLDER = '';

export interface RevertAgendamentoUseCaseRequest {
  agendamentoId: string;
  caller: CallerMember;
  adminUserId: string;
  novoStatus: Extract<AgendamentoStatusValue, 'agendado' | 'confirmado'>;
  motivo: string;
}

export type RevertAgendamentoUseCaseResponse = Either<
  | AgendamentoNotFoundError
  | NotOwnAgendamentoError
  | AgendamentoNotTerminalError
  | AgendamentoConflictError,
  { agendamento: Agendamento }
>;

/**
 * Único jeito de tirar um agendamento de um estado terminal (cancelado/
 * realizado/falta) — exclusivo de owner/admin (ver access-control.ts,
 * resource "agendamento", ação "revert"). novoStatus só aceita
 * agendado/confirmado (garantido pelo Zod, reverter-agendamento.schema.ts)
 * — nunca cancelado, nem para um agendamento "realizado".
 */
@Injectable()
export class RevertAgendamentoUseCase {
  constructor(
    private readonly agendamentosRepository: AgendamentosRepository,
    private readonly agendamentoAuditLogsRepository: AgendamentoAuditLogsRepository,
  ) {}

  async execute(
    request: RevertAgendamentoUseCaseRequest,
  ): Promise<RevertAgendamentoUseCaseResponse> {
    const found = await findOwnedAgendamento(
      this.agendamentosRepository,
      request.agendamentoId,
      request.caller,
    );
    if (found.isLeft()) {
      return left(found.value);
    }

    const agendamento = found.value;

    if (!agendamento.isTerminal()) {
      return left(new AgendamentoNotTerminalError());
    }

    // O horário pode ter sido ocupado por outro agendamento enquanto este
    // estava em estado terminal — revalida antes de confirmar a reversão.
    const bloqueando =
      await this.agendamentosRepository.findManyBlockingForProfissional(
        agendamento.profissionalId,
      );
    const conflito = encontrarConflitoDeHorario(
      {
        id: agendamento.id.toValue(),
        dataHoraInicio: agendamento.dataHoraInicio,
        dataHoraFim: agendamento.dataHoraFim,
      },
      toAgendamentoExistente(bloqueando),
    );
    if (conflito) {
      return left(new AgendamentoConflictError());
    }

    const statusAnterior = agendamento.status;
    agendamento.status = request.novoStatus;
    const updatedAgendamento =
      await this.agendamentosRepository.save(agendamento);

    const auditLog = AgendamentoAuditLog.create({
      organizationId: ORGANIZATION_ID_PLACEHOLDER,
      agendamentoId: agendamento.id.toValue(),
      adminUserId: request.adminUserId,
      statusAnterior,
      statusNovo: request.novoStatus,
      motivo: request.motivo,
    });
    await this.agendamentoAuditLogsRepository.create(auditLog);

    return right({ agendamento: updatedAgendamento });
  }
}
