import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../core/pagination/paginated-result';
import { Agendamento } from '../../enterprise/entities/agendamento';
import { CallerMember } from '../policies/agenda-ownership-policy';
import {
  AgendamentosRepository,
  FindManyAgendamentosFilter,
} from '../repositories/agendamentos-repository';

export interface ListAgendamentosUseCaseRequest {
  caller: CallerMember;
  profissionalId?: string;
  data?: string;
  page: number;
  perPage: number;
}

export type ListAgendamentosUseCaseResponse = PaginatedResult<Agendamento>;

/**
 * Sem erro de negócio esperado — não usa Either (ver create-patient.ts).
 * Staff só vê os próprios agendamentos, automaticamente — nunca falha com
 * 403, apenas filtra (diferente de findOwnedAgendamento, onde acessar por
 * ID o agendamento de outro profissional é uma violação explícita).
 */
@Injectable()
export class ListAgendamentosUseCase {
  constructor(
    private readonly agendamentosRepository: AgendamentosRepository,
  ) {}

  async execute(
    request: ListAgendamentosUseCaseRequest,
  ): Promise<ListAgendamentosUseCaseResponse> {
    const filter: FindManyAgendamentosFilter = {
      page: request.page,
      perPage: request.perPage,
    };

    if (request.caller.role === 'staff') {
      filter.profissionalId = request.caller.id;
    } else if (request.profissionalId) {
      filter.profissionalId = request.profissionalId;
    }

    if (request.data) {
      filter.dataInicio = new Date(`${request.data}T00:00:00.000Z`);
      filter.dataFim = new Date(`${request.data}T23:59:59.999Z`);
    }

    return this.agendamentosRepository.findMany(filter);
  }
}
