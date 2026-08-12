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
import { AgendaExternalCalendarSyncPort } from '@/modules/agenda/application/ports/agenda-external-calendar-sync';
import { AgendamentosRepository } from '@/modules/agenda/application/repositories/agendamentos-repository';
import { ProfissionaisRepository } from '@/modules/agenda/application/repositories/profissionais-repository';
import { AgendamentoConflictError } from '@/modules/agenda/application/use-cases/errors/agendamento-conflict-error';
import { ExternalCalendarConflictError } from '@/modules/agenda/application/use-cases/errors/external-calendar-conflict-error';
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
  | AgendamentoConflictError
  | ExternalCalendarConflictError,
  { agendamento: Agendamento }
>;

@Injectable()
export class CreateAgendamentoUseCase {
  constructor(
    private readonly agendamentosRepository: AgendamentosRepository,
    private readonly profissionaisRepository: ProfissionaisRepository,
    private readonly patientsRepository: PatientsRepository,
    private readonly servicosRepository: ServicosRepository,
    private readonly agendaExternalCalendarSyncPort: AgendaExternalCalendarSyncPort,
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
    let servicoNome: string | undefined;
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
      servicoNome = servico.nome;
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

    // Free/Busy do calendário externo (ver AgendaExternalCalendarSyncPort) —
    // no-op (sempre false) se o profissional não tiver conexão ativa com o
    // Google Calendar.
    const conflitoExterno =
      await this.agendaExternalCalendarSyncPort.checkFreeBusyConflict({
        profissionalId: request.profissionalId,
        dataHoraInicio: request.dataHoraInicio,
        dataHoraFim,
      });
    if (conflitoExterno) {
      return left(new ExternalCalendarConflictError());
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

    // Assíncrono (fila, ver modules/google-calendar/) — no-op se o
    // profissional não tiver conexão ativa. Nunca bloqueia a resposta HTTP.
    await this.agendaExternalCalendarSyncPort.enqueueSync({
      agendamentoId: createdAgendamento.id.toValue(),
      profissionalId: createdAgendamento.profissionalId,
      type: 'upsert',
      snapshot: {
        patientNome: patient.nome,
        servicoNome,
        dataHoraInicio: createdAgendamento.dataHoraInicio,
        dataHoraFim: createdAgendamento.dataHoraFim,
        observacao: createdAgendamento.observacao,
      },
    });

    return right({ agendamento: createdAgendamento });
  }
}
