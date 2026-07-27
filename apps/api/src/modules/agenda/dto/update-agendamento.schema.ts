import { z } from 'zod';
import { agendamentoBaseSchema } from './create-agendamento.schema';

export const updateAgendamentoSchema = agendamentoBaseSchema
  .partial()
  .refine(
    (data) =>
      !data.dataHoraInicio ||
      !data.dataHoraFim ||
      data.dataHoraFim > data.dataHoraInicio,
    {
      message: 'dataHoraFim deve ser depois de dataHoraInicio',
      path: ['dataHoraFim'],
    },
  );

export type UpdateAgendamentoInput = z.infer<typeof updateAgendamentoSchema>;
