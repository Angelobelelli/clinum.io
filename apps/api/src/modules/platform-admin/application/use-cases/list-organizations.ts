import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../core/pagination/paginated-result';
import { Organization } from '../../enterprise/entities/organization';
import { OrganizationsRepository } from '../repositories/organizations-repository';

export interface ListOrganizationsUseCaseRequest {
  page: number;
  perPage: number;
}

export type ListOrganizationsUseCaseResponse = PaginatedResult<Organization>;

/**
 * Sem erro de negócio esperado — não usa Either (ver create-patient.ts).
 * Cross-tenant de propósito: quem garante que só super_admin chega até
 * aqui é PlatformAdminGuard, na borda HTTP — não este use-case.
 */
@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(
    request: ListOrganizationsUseCaseRequest,
  ): Promise<ListOrganizationsUseCaseResponse> {
    return this.organizationsRepository.findMany(request);
  }
}
