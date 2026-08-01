import { Organization } from '../../../enterprise/entities/organization';

export class OrganizationPresenter {
  static toHTTP(organization: Organization) {
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
