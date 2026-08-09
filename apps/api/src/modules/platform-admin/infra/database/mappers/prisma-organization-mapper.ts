import type { Organization as PrismaOrganization } from '@generated/prisma/client';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { Organization } from '@/modules/platform-admin/enterprise/entities/organization';

export class PrismaOrganizationMapper {
  static toDomain(raw: PrismaOrganization): Organization {
    return Organization.create(
      {
        name: raw.name,
        slug: raw.slug,
        customDomain: raw.customDomain,
        vertical: raw.vertical,
        plano: raw.plano,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    );
  }
}
