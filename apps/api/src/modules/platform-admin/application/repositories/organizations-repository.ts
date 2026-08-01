import { PaginatedResult } from '../../../../core/pagination/paginated-result';
import { Organization } from '../../enterprise/entities/organization';

export interface FindManyOrganizationsParams {
  page: number;
  perPage: number;
}

/**
 * Só findMany: platform-admin hoje só LISTA organizations (cross-tenant,
 * de propósito — ver PlatformAdminController). Criação/edição de
 * Organization fica fora deste módulo (src/organizations/, plugin
 * organization do better-auth).
 */
export abstract class OrganizationsRepository {
  abstract findMany(
    params: FindManyOrganizationsParams,
  ): Promise<PaginatedResult<Organization>>;
}
