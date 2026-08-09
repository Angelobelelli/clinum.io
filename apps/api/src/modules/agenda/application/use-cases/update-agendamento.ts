import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import { PatientNotFoundError } from '@/modules/patients/application/use-cases/errors/patient-not-found-error';
import { PatientsRepository } from '@/modules/patients/application/repositories/patients-repository';
import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';
import { encontrarConflitoDeHorario } from '@/modules/agenda/enterprise/check-agendamento-overlap';
import {
  CallerMember,
  isOwnResource,
} from '@/modules/agenda/application/policies/agenda-ownership-policy';
import { AgendamentosRepository } from '@/modules/agenda/application/repositories/agendamentos-repository';
import { ProfissionaisRepository } from '@/modules/agenda/application/repositories/profissionais-repository';
import { AgendamentoConflictError } from '@/modules/agenda/application/use-cases/errors/agendamento-conflict-error';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';
import { InvalidAgendamentoIntervalError } from '@/modules/agenda/application/use-cases/errors/invalid-agendamento-interval-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { ProfissionalNotFoundError } from '@/modules/agenda/application/use-cases/errors/profissional-not-found-error';
import { findOwnedAgendamento } from '@/modules/agenda/application/use-cases/shared/find-owned-agendamento';
import { toAgendamentoExistente } from '@/modules/agenda/application/use-cases/shared/to-agendamento-existente';

export interface UpdateAgendamentoUseCaseRequest {
  agendamentoId: string;
  caller: CallerMember;
  patientId?: string;
  profissionalId?: string;
  dataHoraInicio?: Date;
  dataHoraFim?: Date;
  observacao?: string;
}

export type UpdateAgendamentoUseCaseResponse = Either<
  | AgendamentoNotFoundError
  | NotOwnAgendamentoError
  | AgendamentoTerminalStateError
  | ProfissionalNotFoundError
  | PatientNotFoundError
  | InvalidAgendamentoIntervalError
  | AgendamentoConflictError,
  { agendamento: Agendamento }
>;

@Injectable()
export class UpdateAgendamentoUseCase {
  constructor(
    private readonly agendamentosRepository: AgendamentosRepository,
    private readonly profissionaisRepository: ProfissionaisRepository,
    private readonly patientsRepository: PatientsRepository,
  ) {}

  async execute(
    request: UpdateAgendamentoUseCaseRequest,
  ): Promise<UpdateAgendamentoUseCaseResponse> {
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

    const novoProfissionalId =
      request.profissionalId ?? agendamento.profissionalId;
    // Reforça a mesma restrição na remarcação: staff não pode reatribuir um
    // agendamento pra outro profissional nem mexer no de outro profissional.
    if (!isOwnResource(request.caller, novoProfissionalId)) {
      return left(new NotOwnAgendamentoError());
    }

    if (
      request.profissionalId &&
      request.profissionalId !== agendamento.profissionalId
    ) {
      const profissionalValido =
        await this.profissionaisRepository.existsInCurrentOrganization(
          request.profissionalId,
        );
      if (!profissionalValido) {
        return left(new ProfissionalNotFoundError());
      }
    }

    if (request.patientId && request.patientId !== agendamento.patientId) {
      const patient = await this.patientsRepository.findById(request.patientId);
      if (!patient) {
        return left(new PatientNotFoundError());
      }
    }

    const novaDataInicio = request.dataHoraInicio ?? agendamento.dataHoraInicio;
    const novaDataFim = request.dataHoraFim ?? agendamento.dataHoraFim;
    const mudouIntervaloOuProfissional =
      request.dataHoraInicio !== undefined ||
      request.dataHoraFim !== undefined ||
      request.profissionalId !== undefined;

    if (mudouIntervaloOuProfissional) {
      if (novaDataInicio >= novaDataFim) {
        return left(new InvalidAgendamentoIntervalError());
      }

      const bloqueando =
        await this.agendamentosRepository.findManyBlockingForProfissional(
          novoProfissionalId,
        );
      const conflito = encontrarConflitoDeHorario(
        {
          id: agendamento.id.toValue(),
          dataHoraInicio: novaDataInicio,
          dataHoraFim: novaDataFim,
        },
        toAgendamentoExistente(bloqueando),
      );
      if (conflito) {
        return left(new AgendamentoConflictError());
      }
    }

    if (request.patientId !== undefined)
      agendamento.patientId = request.patientId;
    if (request.profissionalId !== undefined)
      agendamento.profissionalId = request.profissionalId;
    if (request.dataHoraInicio !== undefined)
      agendamento.dataHoraInicio = request.dataHoraInicio;
    if (request.dataHoraFim !== undefined)
      agendamento.dataHoraFim = request.dataHoraFim;
    if (request.observacao !== undefined)
      agendamento.observacao = request.observacao;

    const updatedAgendamento =
      await this.agendamentosRepository.save(agendamento);

    return right({ agendamento: updatedAgendamento });
  }
}
