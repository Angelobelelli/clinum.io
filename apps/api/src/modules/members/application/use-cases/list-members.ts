import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '@/core/pagination/paginated-result';
import { Member } from '@/modules/members/enterprise/entities/member';
import { MembersRepository } from '@/modules/members/application/repositories/members-repository';

export interface ListMembersUseCaseRequest {
  page: number;
  perPage: number;
}

export type ListMembersUseCaseResponse = PaginatedResult<Member>;

/**
 * Sem erro de negócio esperado — não usa Either (ver create-patient.ts).
 * O filtro pela organização atual é resolvido dentro do repositório
 * (getCurrentTenantId()), não aqui.
 */
@Injectable()
export class ListMembersUseCase {
  constructor(private readonly membersRepository: MembersRepository) {}

  async execute(
    request: ListMembersUseCaseRequest,
  ): Promise<ListMembersUseCaseResponse> {
    return this.membersRepository.findMany(request);
  }
}
