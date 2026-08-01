import { PaginatedResult } from '../../../../core/pagination/paginated-result';
import { Member } from '../../enterprise/entities/member';

export interface FindManyMembersParams {
  page: number;
  perPage: number;
}

/**
 * findMany/findById/save: este módulo nunca cria nem deleta Member (isso é
 * responsabilidade do plugin organization do better-auth, ver auth.ts) —
 * só lê (individualmente ou em lista) e atualiza tipoVinculo/status de um
 * Member já existente.
 */
export abstract class MembersRepository {
  abstract findById(id: string): Promise<Member | null>;
  abstract findMany(
    params: FindManyMembersParams,
  ): Promise<PaginatedResult<Member>>;
  abstract save(member: Member): Promise<Member>;
}
