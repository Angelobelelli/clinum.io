import { PaginatedResult } from '@/core/pagination/paginated-result';
import { Servico } from '@/modules/servicos/enterprise/entities/servico';

export interface FindManyServicosFilter {
  ativo?: boolean;
  page: number;
  perPage: number;
}

export abstract class ServicosRepository {
  abstract create(servico: Servico): Promise<void>;
  abstract findById(id: string): Promise<Servico | null>;
  abstract findMany(
    filter: FindManyServicosFilter,
  ): Promise<PaginatedResult<Servico>>;
  abstract save(servico: Servico): Promise<void>;
}
