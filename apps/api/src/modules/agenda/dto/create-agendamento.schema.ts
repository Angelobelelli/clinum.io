import { z } from 'zod';

/**
 * Base compartilhada com update-agendamento.schema.ts (partial()). Os
 * refines fica em cada schema final (create/update), não aqui —
 * z.object.partial() não preserva refine feito antes dele.
 */
export const agendamentoBaseSchema = z.object({
  patientId: z.string().min(1, 'patientId é obrigatório'),
  profissionalId: z.string().min(1, 'profissionalId é obrigatório'),
  servicoId: z.string().optional(),
  dataHoraInicio: z.coerce.date(),
  dataHoraFim: z.coerce.date().optional(),
  observacao: z.string().optional(),
});

export const createAgendamentoSchema = agendamentoBaseSchema
  .refine(
    (data) => data.servicoId !== undefined || data.dataHoraFim !== undefined,
    {
      message: 'Informe servicoId ou dataHoraFim',
      path: ['dataHoraFim'],
    },
  )
  .refine(
    (data) => !(data.servicoId !== undefined && data.dataHoraFim !== undefined),
    {
      message: 'Não é possível informar servicoId e dataHoraFim ao mesmo tempo',
      path: ['dataHoraFim'],
    },
  )
  .refine(
    (data) =>
      data.servicoId !== undefined ||
      (data.dataHoraFim !== undefined &&
        data.dataHoraFim > data.dataHoraInicio),
    {
      message: 'dataHoraFim deve ser depois de dataHoraInicio',
      path: ['dataHoraFim'],
    },
  );

export type CreateAgendamentoInput = z.infer<typeof createAgendamentoSchema>;
