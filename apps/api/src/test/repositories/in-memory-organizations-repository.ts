import { PaginatedResult } from '@/core/pagination/paginated-result';
import {
  FindManyOrganizationsParams,
  OrganizationsRepository,
} from '@/modules/platform-admin/application/repositories/organizations-repository';
import { Organization } from '@/modules/platform-admin/enterprise/entities/organization';

export class InMemoryOrganizationsRepository implements OrganizationsRepository {
  public items: Organization[] = [];

  findMany({
    page,
    perPage,
  }: FindManyOrganizationsParams): Promise<PaginatedResult<Organization>> {
    const start = (page - 1) * perPage;

    return Promise.resolve({
      items: this.items.slice(start, start + perPage),
      total: this.items.length,
      page,
      perPage,
    });
  }
}
