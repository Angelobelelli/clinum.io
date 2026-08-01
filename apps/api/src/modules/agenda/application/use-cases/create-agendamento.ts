import { Injectable } from '@nestjs/common';
import { Either, left, right } from '../../../../core/either';
import { PatientNotFoundError } from '../../../patients/application/use-cases/errors/patient-not-found-error';
import { PatientsRepository } from '../../../patients/application/repositories/patients-repository';
import { Agendamento } from '../../enterprise/entities/agendamento';
import { encontrarConflitoDeHorario } from '../../enterprise/check-agendamento-overlap';
import {
  CallerMember,
  isOwnResource,
} from '../policies/agenda-ownership-policy';
import { AgendamentosRepository } from '../repositories/agendamentos-repository';
import { ProfissionaisRepository } from '../repositories/profissionais-repository';
import { AgendamentoConflictError } from './errors/agendamento-conflict-error';
import { NotOwnAgendamentoError } from './errors/not-own-agendamento-error';
import { ProfissionalNotFoundError } from './errors/profissional-not-found-error';
import { toAgendamentoExistente } from './shared/to-agendamento-existente';

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
