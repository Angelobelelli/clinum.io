import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import {
  Agendamento,
  AgendamentoProps,
} from '@/modules/agenda/enterprise/entities/agendamento';

let sequence = 0;

export function makeAgendamento(
  override: Partial<AgendamentoProps> = {},
  id?: UniqueEntityID,
): Agendamento {
  sequence += 1;

  return Agendamento.create(
    {
      organizationId: 'org-test',
      servicoId: null,
      patientId: `patient-${sequence}`,
      profissionalId: `profissional-${sequence}`,
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
      observacao: null,
      ...override,
    },
    id,
  );
}
