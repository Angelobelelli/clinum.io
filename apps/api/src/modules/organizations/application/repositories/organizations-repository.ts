import { Organization } from '@/modules/organizations/enterprise/entities/organization';

/**
 * Contrato abstrato (não interface do TS) para poder ser usado como token
 * de injeção de dependência do Nest (`provide: OrganizationsRepository,
 * useClass: PrismaOrganizationsRepository`). A implementação Prisma nunca é
 * referenciada fora de infra/; use-cases só conhecem este contrato.
 */
export abstract class OrganizationsRepository {
  abstract findById(id: string): Promise<Organization | null>;
  abstract create(organization: Organization): Promise<Organization>;
}
