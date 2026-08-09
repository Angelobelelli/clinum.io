import { PaginatedResult } from '@/core/pagination/paginated-result';
import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';

export interface FindManyAgendamentosFilter {
  profissionalId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  page: number;
  perPage: number;
}

export abstract class AgendamentosRepository {
  abstract findById(id: string): Promise<Agendamento | null>;
  abstract findMany(
    filter: FindManyAgendamentosFilter,
  ): Promise<PaginatedResult<Agendamento>>;

  /**
   * Agendamentos do profissional em status que "ocupam" horário (ver
   * STATUS_QUE_BLOQUEIAM_HORARIO em enterprise/entities/agendamento.ts) —
   * usado pelos use-cases pra alimentar encontrarConflitoDeHorario(), que
   * por sua vez ignora o próprio registro (atualização/remarcação/
   * reversão) via candidato.id — não é filtrado aqui na query.
   */
  abstract findManyBlockingForProfissional(
    profissionalId: string,
  ): Promise<Agendamento[]>;

  abstract create(agendamento: Agendamento): Promise<Agendamento>;
  abstract save(agendamento: Agendamento): Promise<Agendamento>;
}
