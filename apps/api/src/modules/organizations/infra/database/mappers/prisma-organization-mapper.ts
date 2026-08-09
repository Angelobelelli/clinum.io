import type {
  Organization as PrismaOrganization,
  Prisma,
} from '../../../../../../generated/prisma/client';
import { UniqueEntityID } from '../../../../../core/entities/unique-entity-id';
import { Organization } from '../../../enterprise/entities/organization';

export class PrismaOrganizationMapper {
  static toDomain(raw: PrismaOrganization): Organization {
    return Organization.create(
      {
        name: raw.name,
        slug: raw.slug,
        logo: raw.logo,
        metadata: raw.metadata,
        customDomain: raw.customDomain,
        vertical: raw.vertical,
        plano: raw.plano,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  /**
   * id e createdAt incluídos explicitamente: ao contrário de outros models
   * (ex: Patient), Organization não tem @default(cuid())/@default(now()) no
   * schema — quem gera esses valores é a própria entidade (UniqueEntityID
   * gera um randomUUID quando nenhum id é passado, ver Organization.create
   * no use-case).
   */
  static toPrismaCreate(
    organization: Organization,
  ): Prisma.OrganizationCreateInput {
    return {
      id: organization.id.toValue(),
      name: organization.name,
      slug: organization.slug,
      customDomain: organization.customDomain,
      vertical: organization.vertical,
      plano: organization.plano,
      createdAt: organization.createdAt,
    };
  }
}
