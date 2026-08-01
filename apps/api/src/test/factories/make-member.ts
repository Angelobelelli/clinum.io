import { UniqueEntityID } from '../../core/entities/unique-entity-id';
import {
  Member,
  MemberProps,
} from '../../modules/members/enterprise/entities/member';

export function makeMember(
  override: Partial<MemberProps> = {},
  id?: UniqueEntityID,
): Member {
  return Member.create(
    {
      organizationId: 'org-test',
      userId: new UniqueEntityID().toValue(),
      role: 'staff',
      tipoVinculo: null,
      status: 'ativo',
      createdAt: new Date(),
      ...override,
    },
    id,
  );
}
