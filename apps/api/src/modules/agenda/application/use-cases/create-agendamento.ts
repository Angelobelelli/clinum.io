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
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { ProfissionalNotFoundError } from '@/modules/agenda/application/use-cases/errors/profissional-not-found-error';
import { toAgendamentoExistente } from '@/modules/agenda/application/use-cases/shared/to-agendamento-existente';

// organizationId placeholder: ver mesmo padrão em
// patients/application/use-cases/create-patient.ts (sempre sobrescrito pela
// extension de tenant no `create`).
const ORGANIZATION_ID_PLACEHOLDER = '';

export interface CreateAgendamentoUseCaseRequest {
  patientId: string;
  profissionalId: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  observacao?: string;
  caller: CallerMember;
}

export type CreateAgendamentoUseCaseResponse = Either<
  | NotOwnAgendamentoError
  | ProfissionalNotFoundError
  | PatientNotFoundError
  | AgendamentoConflictError,
  { agendamento: Agendamento }
>;

@Injectable()
export class CreateAgendamentoUseCase {
  constructor(
    private readonly agendamentosRepository: AgendamentosRepository,
    private readonly profissionaisRepository: ProfissionaisRepository,
    private readonly patientsRepository: PatientsRepository,
  ) {}

  async execute(
    request: CreateAgendamentoUseCaseRequest,
  ): Promise<CreateAgendamentoUseCaseResponse> {
    if (!isOwnResource(request.caller, request.profissionalId)) {
      return left(new NotOwnAgendamentoError());
    }

    const profissionalValido =
      await this.profissionaisRepository.existsInCurrentOrganization(
        request.profissionalId,
      );
    if (!profissionalValido) {
      return left(new ProfissionalNotFoundError());
    }

    const patient = await this.patientsRepository.findById(request.patientId);
    if (!patient) {
      return left(new PatientNotFoundError());
    }

    const bloqueando =
      await this.agendamentosRepository.findManyBlockingForProfissional(
        request.profissionalId,
      );
    const conflito = encontrarConflitoDeHorario(
      {
        dataHoraInicio: request.dataHoraInicio,
        dataHoraFim: request.dataHoraFim,
      },
      toAgendamentoExistente(bloqueando),
    );
    if (conflito) {
      return left(new AgendamentoConflictError());
    }

    const agendamento = Agendamento.create({
      organizationId: ORGANIZATION_ID_PLACEHOLDER,
      patientId: request.patientId,
      profissionalId: request.profissionalId,
      dataHoraInicio: request.dataHoraInicio,
      dataHoraFim: request.dataHoraFim,
      observacao: request.observacao,
    });

    const createdAgendamento =
      await this.agendamentosRepository.create(agendamento);

    return right({ agendamento: createdAgendamento });
  }
}
