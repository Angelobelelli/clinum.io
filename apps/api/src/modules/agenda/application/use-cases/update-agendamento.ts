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
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';
import { ExternalCalendarConflictError } from '@/modules/agenda/application/use-cases/errors/external-calendar-conflict-error';
import { InvalidAgendamentoIntervalError } from '@/modules/agenda/application/use-cases/errors/invalid-agendamento-interval-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { ProfissionalNotFoundError } from '@/modules/agenda/application/use-cases/errors/profissional-not-found-error';
import { ServicoInativoError } from '@/modules/agenda/application/use-cases/errors/servico-inativo-error';
import { findOwnedAgendamento } from '@/modules/agenda/application/use-cases/shared/find-owned-agendamento';
import { toAgendamentoExistente } from '@/modules/agenda/application/use-cases/shared/to-agendamento-existente';

export interface UpdateAgendamentoUseCaseRequest {
  agendamentoId: string;
  caller: CallerMember;
  patientId?: string;
  profissionalId?: string;
  dataHoraInicio?: Date;
  // servicoId e dataHoraFim são mutuamente exclusivos quando os dois vêm
  // preenchidos — garantido pelo updateAgendamentoSchema, não revalidado
  // aqui. Se nenhum dos dois vier, dataHoraFim atual do agendamento não
  // muda (mesmo comportamento de antes desta mudança).
  dataHoraFim?: Date;
  servicoId?: string;
  observacao?: string;
}

export type UpdateAgendamentoUseCaseResponse = Either<
  | AgendamentoNotFoundError
  | NotOwnAgendamentoError
  | AgendamentoTerminalStateError
  | ProfissionalNotFoundError
  | PatientNotFoundError
  | ServicoNotFoundError
  | ServicoInativoError
  | InvalidAgendamentoIntervalError
  | AgendamentoConflictError
  | ExternalCalendarConflictError,
  { agendamento: Agendamento }
>;

@Injectable()
export class UpdateAgendamentoUseCase {
  constructor(
    private readonly agendamentosRepository: AgendamentosRepository,
    private readonly profissionaisRepository: ProfissionaisRepository,
    private readonly patientsRepository: PatientsRepository,
    private readonly servicosRepository: ServicosRepository,
    private readonly agendaExternalCalendarSyncPort: AgendaExternalCalendarSyncPort,
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

    let novaDataFim: Date;
    if (request.servicoId !== undefined) {
      const servico = await this.servicosRepository.findById(request.servicoId);
      if (!servico) {
        return left(new ServicoNotFoundError());
      }
      if (!servico.ativo) {
        return left(new ServicoInativoError());
      }
      novaDataFim = calcularDataHoraFim(novaDataInicio, servico.duracaoMinutos);
    } else if (request.dataHoraFim !== undefined) {
      novaDataFim = request.dataHoraFim;
    } else {
      novaDataFim = agendamento.dataHoraFim;
    }

    const mudouIntervaloOuProfissional =
      request.dataHoraInicio !== undefined ||
      request.dataHoraFim !== undefined ||
      request.servicoId !== undefined ||
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

      // Free/Busy do calendário externo (ver AgendaExternalCalendarSyncPort)
      // — só checado quando o horário/profissional realmente muda, mesmo
      // gate de mudouIntervaloOuProfissional acima. No-op (sempre false) se
      // o novo profissional não tiver conexão ativa.
      const conflitoExterno =
        await this.agendaExternalCalendarSyncPort.checkFreeBusyConflict({
          profissionalId: novoProfissionalId,
          dataHoraInicio: novaDataInicio,
          dataHoraFim: novaDataFim,
        });
      if (conflitoExterno) {
        return left(new ExternalCalendarConflictError());
      }
    }

    const profissionalAnteriorId = agendamento.profissionalId;

    if (request.patientId !== undefined)
      agendamento.patientId = request.patientId;
    if (request.profissionalId !== undefined)
      agendamento.profissionalId = request.profissionalId;
    if (request.dataHoraInicio !== undefined)
      agendamento.dataHoraInicio = request.dataHoraInicio;
    if (request.servicoId !== undefined)
      agendamento.servicoId = request.servicoId;
    if (request.dataHoraFim !== undefined || request.servicoId !== undefined)
      agendamento.dataHoraFim = novaDataFim;
    if (request.observacao !== undefined)
      agendamento.observacao = request.observacao;

    const updatedAgendamento =
      await this.agendamentosRepository.save(agendamento);

    const [patientAtual, servicoAtual] = await Promise.all([
      this.patientsRepository.findById(updatedAgendamento.patientId),
      updatedAgendamento.servicoId
        ? this.servicosRepository.findById(updatedAgendamento.servicoId)
        : Promise.resolve(null),
    ]);

    // Assíncrono (fila, ver modules/google-calendar/) — no-op se nem o
    // profissional novo nem o anterior tiverem conexão ativa.
    await this.agendaExternalCalendarSyncPort.enqueueSync({
      agendamentoId: updatedAgendamento.id.toValue(),
      profissionalId: updatedAgendamento.profissionalId,
      previousProfissionalId:
        profissionalAnteriorId !== updatedAgendamento.profissionalId
          ? profissionalAnteriorId
          : undefined,
      type: 'upsert',
      snapshot: {
        // patientAtual só pode ser null aqui num cenário artificial de teste
        // (fake repository sem o paciente semeado) — em produção a FK de
        // Agendamento.patientId garante que o paciente sempre existe.
        patientNome: patientAtual?.nome ?? '',
        servicoNome: servicoAtual?.nome,
        dataHoraInicio: updatedAgendamento.dataHoraInicio,
        dataHoraFim: updatedAgendamento.dataHoraFim,
        observacao: updatedAgendamento.observacao,
      },
    });

    return right({ agendamento: updatedAgendamento });
  }
}
