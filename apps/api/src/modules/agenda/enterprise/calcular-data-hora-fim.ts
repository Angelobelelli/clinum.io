/**
 * Calcula dataHoraFim a partir de dataHoraInicio + duração (em minutos).
 * Função pura, sem dependência de Nest/Prisma nem da entidade Servico — os
 * use-cases (create/update-agendamento) são responsáveis por buscar o
 * Servico e extrair duracaoMinutos antes de chamar aqui, mesmo racional de
 * encontrarConflitoDeHorario em check-agendamento-overlap.ts (isolamento +
 * reutilização entre create e update).
 */
export function calcularDataHoraFim(
  dataHoraInicio: Date,
  duracaoMinutos: number,
): Date {
  return new Date(dataHoraInicio.getTime() + duracaoMinutos * 60_000);
}
