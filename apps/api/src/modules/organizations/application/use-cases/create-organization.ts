import { Injectable } from '@nestjs/common';
import { Organization } from '@/modules/organizations/enterprise/entities/organization';
import { OrganizationsRepository } from '@/modules/organizations/application/repositories/organizations-repository';

export interface CreateOrganizationUseCaseRequest {
  name: string;
  slug: string;
  customDomain?: string;
  vertical?: string;
  plano?: string;
}

export interface CreateOrganizationUseCaseResponse {
  organization: Organization;
}

/**
 * Sem erro de negócio esperado aqui (o único erro possível é violação de
 * unique constraint do Postgres em slug/customDomain, já tratado
 * globalmente pelo PrismaExceptionFilter) — por isso não usa Either, mesmo
 * racional de CreatePatientUseCase.
 */
@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(
    request: CreateOrganizationUseCaseRequest,
  ): Promise<CreateOrganizationUseCaseResponse> {
    const organization = Organization.create({
      name: request.name,
      slug: request.slug,
      customDomain: request.customDomain,
      vertical: request.vertical,
      plano: request.plano,
    });

    const created = await this.organizationsRepository.create(organization);

    return { organization: created };
  }
}
