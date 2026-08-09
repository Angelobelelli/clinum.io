import { Organization } from '@/modules/organizations/enterprise/entities/organization';

/**
 * Achata a entidade de volta pro mesmo formato de linha que o Prisma
 * retornava antes desta refatoração (organizations.controller.ts cru) —
 * pra não quebrar nenhum consumidor (frontend, testes) que dependa do
 * shape da resposta.
 */
export class OrganizationPresenter {
  static toHTTP(organization: Organization) {
    return {
      id: organization.id.toValue(),
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      createdAt: organization.createdAt,
      metadata: organization.metadata,
      customDomain: organization.customDomain,
      vertical: organization.vertical,
      plano: organization.plano,
    };
  }
}
