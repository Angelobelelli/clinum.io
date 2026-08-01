import { PaginatedResult } from 'src/core/pagination/paginated-result';
import { Servico } from '../../enterprise/entities/servico';
import { Injectable } from '@nestjs/common';
import {
  FindManyServicosFilter,
  ServicosRepository,
} from '../repositories/servicos-repository';

export interface ListServicosUseCaseRequest {
  ativo?: boolean;
  page: number;
  perPage: number;
}
export type ListServicosUseCaseResponse = PaginatedResult<Servico>;

@Injectable()
export class ListServicosUseCase {
  constructor(private readonly servicosRepository: ServicosRepository) {}
  async execute(
    request: ListServicosUseCaseRequest,
  ): Promise<ListServicosUseCaseResponse> {
    const filter: FindManyServicosFilter = {
      page: request.page,
      perPage: request.perPage,
    };

    if (request.ativo !== undefined) {
      filter.ativo = request.ativo;
    }

    return this.servicosRepository.findMany(filter);
  }
}
