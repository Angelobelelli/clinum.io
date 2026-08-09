import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../core/pagination/paginated-result';
import { PrismaService } from '../../../../infra/database/prisma.service';
import { Organization } from '../../enterprise/entities/organization';
import {
  FindManyOrganizationsParams,
  OrganizationsRepository,
} from '../../application/repositories/organizations-repository';
import { PrismaOrganizationMapper } from './mappers/prisma-organization-mapper';

/**
 * Usa PrismaService cru (conexão superuser) de propósito — cross-tenant,
 * lista organizations de TODOS os tenants, nunca TenantScopedPrismaService
 * (que nem faria sentido aqui: não há um "tenant atual" numa rota
 * @SkipTenantMatch()).
 */
@Injectable()
export class PrismaOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany({
    page,
    perPage,
  }: FindManyOrganizationsParams): Promise<PaginatedResult<Organization>> {
    const [organizations, total] = await Promise.all([
      this.prisma.db.organization.findMany({
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.db.organization.count(),
    ]);

    return {
      items: organizations.map((organization) =>
        PrismaOrganizationMapper.toDomain(organization),
      ),
      total,
      page,
      perPage,
    };
  }
}
