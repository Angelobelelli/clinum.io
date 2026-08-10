import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';

/**
 * Achata a entidade de volta pro mesmo formato de linha que o Prisma
 * retornava antes desta refatoração (agenda.service.ts cru) — ver mesmo
 * racional em patients/infra/http/presenters/patient-presenter.ts.
 */
export class AgendamentoPresenter {
  static toHTTP(agendamento: Agendamento) {
    return {
      id: agendamento.id.toValue(),
      organizationId: agendamento.organizationId,
      servicoId: agendamento.servicoId,
      patientId: agendamento.patientId,
      profissionalId: agendamento.profissionalId,
      dataHoraInicio: agendamento.dataHoraInicio,
      dataHoraFim: agendamento.dataHoraFim,
      status: agendamento.status,
      observacao: agendamento.observacao,
      createdAt: agendamento.createdAt,
      updatedAt: agendamento.updatedAt,
    };
  }
}
