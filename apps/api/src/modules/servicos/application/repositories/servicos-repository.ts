import { PaginatedResult } from '../../../../core/pagination/paginated-result';
import { Servico } from '../../enterprise/entities/servico';

export interface FindManyServicosFilter {
  profissionalId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  ativo?: boolean;
  page: number;
  perPage: number;
}
export abstract class ServicosRepository {
  abstract create(servico: Servico): Promise<Servico>;
  abstract findById(id: string): Promise<Servico | null>;
  abstract findMany(
    filter: FindManyServicosFilter,
  ): Promise<PaginatedResult<Servico>>;
  abstract save(servico: Servico): Promise<Servico>;
}
