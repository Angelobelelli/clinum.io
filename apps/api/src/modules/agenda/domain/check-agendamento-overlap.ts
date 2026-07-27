/**
 * Regra de negócio central do módulo agenda: impedir que um mesmo
 * profissional tenha dois agendamentos com horário sobreposto.
 *
 * Deliberadamente sem nenhuma dependência de Nest/Prisma — recebe só datas
 * e retorna um resultado, pra ser testável isoladamente (ver
 * check-agendamento-overlap.spec.ts) e reutilizável tanto na criação quanto
 * na atualização/remarcação (AgendaService é responsável por buscar os
 * agendamentos existentes do profissional — já filtrados por tenant e por
 * status agendado/confirmado — e passar pra cá).
 */

export interface AgendamentoExistente {
  id: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
}

export interface AgendamentoCandidato {
  /** Ausente na criação; presente na atualização, pra ignorar o próprio registro. */
  id?: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
}

/**
 * Dois intervalos [inicio, fim) se sobrepõem sse início de um vem antes do
 * fim do outro, nos dois sentidos. Intervalos que apenas se tocam (fim de
 * um === início do outro) não contam como choque — permite agendar às
 * 10:00 alguém que termina às 10:00.
 */
function intervalosSeSobrepoe(
  a: AgendamentoCandidato,
  b: AgendamentoExistente,
): boolean {
  return a.dataHoraInicio < b.dataHoraFim && b.dataHoraInicio < a.dataHoraFim;
}

/**
 * Retorna o primeiro agendamento existente que conflita com o candidato,
 * ou undefined se não há choque. `agendamentosExistentes` deve já vir
 * filtrado (mesmo profissional, mesmo tenant, status agendado/confirmado)
 * — esta função não sabe nada sobre profissional/tenant/status.
 */
export function encontrarConflitoDeHorario(
  candidato: AgendamentoCandidato,
  agendamentosExistentes: AgendamentoExistente[],
): AgendamentoExistente | undefined {
  return agendamentosExistentes.find(
    (existente) =>
      existente.id !== candidato.id &&
      intervalosSeSobrepoe(candidato, existente),
  );
}
