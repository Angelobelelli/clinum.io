import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/database/prisma.service';
import { OrganizationsRepository } from '../../application/repositories/organizations-repository';
import { Organization } from '../../enterprise/entities/organization';
import { PrismaOrganizationMapper } from './mappers/prisma-organization-mapper';

/**
 * Usa PrismaService (client cru), não TenantScopedPrismaService — Organization
 * é a própria raiz do tenant, não uma tabela de negócio tenant-scoped (ver
 * comentário em infra/database/prisma.service.ts).
 */
@Injectable()
export class PrismaOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Organization | null> {
    const organization = await this.prisma.db.organization.findUnique({
      where: { id },
    });

    return organization
      ? PrismaOrganizationMapper.toDomain(organization)
      : null;
  }

  async create(organization: Organization): Promise<Organization> {
    const created = await this.prisma.db.organization.create({
      data: PrismaOrganizationMapper.toPrismaCreate(organization),
    });

    return PrismaOrganizationMapper.toDomain(created);
  }
}
