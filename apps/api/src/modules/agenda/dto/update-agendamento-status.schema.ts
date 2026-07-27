import { z } from 'zod';

/**
 * Endpoint /agendamentos/:id/status é só pra marcar o desfecho de um
 * atendimento que já deveria ter acontecido — nunca "agendado"/
 * "confirmado" (isso é o estado inicial/de confirmação, não um desfecho) e
 * nunca "cancelado" (que tem endpoint próprio, /agendamentos/:id/cancelar).
 */
export const updateAgendamentoStatusSchema = z.object({
  status: z.enum(['realizado', 'falta']),
});

export type UpdateAgendamentoStatusInput = z.infer<
  typeof updateAgendamentoStatusSchema
>;
