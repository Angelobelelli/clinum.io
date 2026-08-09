import { PaginatedResult } from '@/core/pagination/paginated-result';
import {
  FindManyMembersParams,
  MembersRepository,
} from '@/modules/members/application/repositories/members-repository';
import { Member } from '@/modules/members/enterprise/entities/member';

export class InMemoryMembersRepository implements MembersRepository {
  public items: Member[] = [];

  findById(id: string): Promise<Member | null> {
    const member = this.items.find((item) => item.id.toValue() === id);

    return Promise.resolve(member ?? null);
  }

  findMany({
    page,
    perPage,
  }: FindManyMembersParams): Promise<PaginatedResult<Member>> {
    const start = (page - 1) * perPage;

    return Promise.resolve({
      items: this.items.slice(start, start + perPage),
      total: this.items.length,
      page,
      perPage,
    });
  }

  save(member: Member): Promise<Member> {
    const index = this.items.findIndex(
      (item) => item.id.toValue() === member.id.toValue(),
    );

    if (index >= 0) {
      this.items[index] = member;
    }

    return Promise.resolve(member);
  }
}
