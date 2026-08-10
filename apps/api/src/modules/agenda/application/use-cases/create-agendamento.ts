import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import { PatientNotFoundError } from '@/modules/patients/application/use-cases/errors/patient-not-found-error';
import { PatientsRepository } from '@/modules/patients/application/repositories/patients-repository';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';
import { ServicosRepository } from '@/modules/servicos/application/repositories/servicos-repository';
import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';
import { calcularDataHoraFim } from '@/modules/agenda/enterprise/calcular-data-hora-fim';
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
import { ServicoInativoError } from '@/modules/agenda/application/use-cases/errors/servico-inativo-error';
import { toAgendamentoExistente } from '@/modules/agenda/application/use-cases/shared/to-agendamento-existente';

// organizationId placeholder: ver mesmo padrão em
// patients/application/use-cases/create-patient.ts (sempre sobrescrito pela
// extension de tenant no `create`).
const ORGANIZATION_ID_PLACEHOLDER = '';

export interface CreateAgendamentoUseCaseRequest {
  patientId: string;
  profissionalId: string;
  dataHoraInicio: Date;
  // Exatamente um dos dois chega preenchido — garantido pelo
  // createAgendamentoSchema (ver dto/create-agendamento.schema.ts), não
  // revalidado aqui.
  dataHoraFim?: Date;
  servicoId?: string;
  observacao?: string;
  caller: CallerMember;
}

export type CreateAgendamentoUseCaseResponse = Either<
  | NotOwnAgendamentoError
  | ProfissionalNotFoundError
  | PatientNotFoundError
  | ServicoNotFoundError
  | ServicoInativoError
  | AgendamentoConflictError,
  { agendamento: Agendamento }
>;

@Injectable()
export class CreateAgendamentoUseCase {
  constructor(
    private readonly agendamentosRepository: AgendamentosRepository,
    private readonly profissionaisRepository: ProfissionaisRepository,
    private readonly patientsRepository: PatientsRepository,
    private readonly servicosRepository: ServicosRepository,
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

    let dataHoraFim: Date;
    if (request.servicoId !== undefined) {
      const servico = await this.servicosRepository.findById(request.servicoId);
      if (!servico) {
        return left(new ServicoNotFoundError());
      }
      if (!servico.ativo) {
        return left(new ServicoInativoError());
      }
      dataHoraFim = calcularDataHoraFim(
        request.dataHoraInicio,
        servico.duracaoMinutos,
      );
    } else {
      dataHoraFim = request.dataHoraFim!;
    }

    const bloqueando =
      await this.agendamentosRepository.findManyBlockingForProfissional(
        request.profissionalId,
      );
    const conflito = encontrarConflitoDeHorario(
      {
        dataHoraInicio: request.dataHoraInicio,
        dataHoraFim,
      },
      toAgendamentoExistente(bloqueando),
    );
    if (conflito) {
      return left(new AgendamentoConflictError());
    }

    const agendamento = Agendamento.create({
      organizationId: ORGANIZATION_ID_PLACEHOLDER,
      servicoId: request.servicoId,
      patientId: request.patientId,
      profissionalId: request.profissionalId,
      dataHoraInicio: request.dataHoraInicio,
      dataHoraFim,
      observacao: request.observacao,
    });

    const createdAgendamento =
      await this.agendamentosRepository.create(agendamento);

    return right({ agendamento: createdAgendamento });
  }
}
