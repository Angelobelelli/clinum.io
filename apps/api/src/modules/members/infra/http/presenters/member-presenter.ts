import { Member } from '@/modules/members/enterprise/entities/member';

export class MemberPresenter {
  static toHTTP(member: Member) {
    return {
      id: member.id.toValue(),
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role,
      tipoVinculo: member.tipoVinculo,
      status: member.status,
      createdAt: member.createdAt,
    };
  }
}
