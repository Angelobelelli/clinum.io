import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import {
  Organization,
  OrganizationProps,
} from '@/modules/platform-admin/enterprise/entities/organization';

let sequence = 0;

export function makeOrganization(
  override: Partial<OrganizationProps> = {},
  id?: UniqueEntityID,
): Organization {
  sequence += 1;

  return Organization.create(
    {
      name: `Organização de teste ${sequence}`,
      slug: `org-teste-${sequence}`,
      customDomain: null,
      vertical: 'clinica_medica',
      plano: 'basico',
      createdAt: new Date(),
      ...override,
    },
    id,
  );
}
