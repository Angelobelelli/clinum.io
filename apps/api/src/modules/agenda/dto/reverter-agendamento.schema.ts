import { z } from 'zod';

/**
 * novoStatus só aceita "agendado"/"confirmado" — nunca "cancelado". Isso
 * garante, inclusive pra um agendamento "realizado", que a reversão nunca
 * vira um cancelamento disfarçado (ver AgendaService.reverter()).
 */
export const reverterAgendamentoSchema = z.object({
  novoStatus: z.enum(['agendado', 'confirmado']),
  motivo: z.string().min(10, 'motivo deve ter pelo menos 10 caracteres'),
});

export type ReverterAgendamentoInput = z.infer<
  typeof reverterAgendamentoSchema
>;
