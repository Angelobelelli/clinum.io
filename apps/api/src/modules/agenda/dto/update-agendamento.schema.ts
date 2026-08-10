import { z } from 'zod';
import { agendamentoBaseSchema } from '@/modules/agenda/dto/create-agendamento.schema';

export const updateAgendamentoSchema = agendamentoBaseSchema
  .partial()
  .refine(
    (data) => !(data.servicoId !== undefined && data.dataHoraFim !== undefined),
    {
      message: 'Não é possível informar servicoId e dataHoraFim ao mesmo tempo',
      path: ['dataHoraFim'],
    },
  )
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
