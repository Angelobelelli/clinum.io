import { AgendamentoExistente } from '../../../enterprise/check-agendamento-overlap';
import { Agendamento } from '../../../enterprise/entities/agendamento';

/**
 * Adapta entidades Agendamento pro formato plano que
 * encontrarConflitoDeHorario() espera — mantém a função de sobreposição
 * (enterprise/check-agendamento-overlap.ts) sem depender da entidade/
 * UniqueEntityID, só de datas e um id string.
 */
export function toAgendamentoExistente(
  agendamentos: Agendamento[],
): AgendamentoExistente[] {
  return agendamentos.map((agendamento) => ({
    id: agendamento.id.toValue(),
    dataHoraInicio: agendamento.dataHoraInicio,
    dataHoraFim: agendamento.dataHoraFim,
  }));
}
