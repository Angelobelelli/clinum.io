import { PaginatedResult } from '@/core/pagination/paginated-result';
import { Servico } from '@/modules/servicos/enterprise/entities/servico';
import { Injectable } from '@nestjs/common';
import {
  FindManyServicosFilter,
  ServicosRepository,
} from '@/modules/servicos/application/repositories/servicos-repository';

export interface ListServicosUseCaseRequest {
  page: number;
  perPage: number;
}
export type ListServicosUseCaseResponse = PaginatedResult<Servico>;

@Injectable()
export class ListServicosUseCase {
  constructor(private readonly servicosRepository: ServicosRepository) {}
  execute({
    page,
    perPage,
  }: ListServicosUseCaseRequest): Promise<ListServicosUseCaseResponse> {
    const filter: FindManyServicosFilter = {
      page: page,
      perPage: perPage,
    };

    return this.servicosRepository.findMany(filter);
  }
}
