import type {
  Prisma,
  Member as PrismaMember,
} from '../../../../../../generated/prisma/client';
import { UniqueEntityID } from '../../../../../core/entities/unique-entity-id';
import { Member } from '../../../enterprise/entities/member';

export class PrismaMemberMapper {
  static toDomain(raw: PrismaMember): Member {
    return Member.create(
      {
        organizationId: raw.organizationId,
        userId: raw.userId,
        role: raw.role,
        tipoVinculo: raw.tipoVinculo,
        status: raw.status,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrismaUpdate(member: Member): Prisma.MemberUpdateInput {
    return {
      tipoVinculo: member.tipoVinculo,
      status: member.status,
    };
  }
}
