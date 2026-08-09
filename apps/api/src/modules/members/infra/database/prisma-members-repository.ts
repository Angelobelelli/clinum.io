import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '@/core/pagination/paginated-result';
import { PrismaService } from '@/infra/database/prisma.service';
import { getCurrentTenantId } from '@/infra/tenant/tenant-context';
import { Member } from '@/modules/members/enterprise/entities/member';
import {
  FindManyMembersParams,
  MembersRepository,
} from '@/modules/members/application/repositories/members-repository';
import { PrismaMemberMapper } from '@/modules/members/infra/database/mappers/prisma-member-mapper';

/**
 * Member não é TENANT_SCOPED_MODELS (ver prisma-tenant.extension.ts) —
 * usa o PrismaService cru (conexão superuser), nunca
 * TenantScopedPrismaService. Diferente de findById/save (usados só depois
 * que um guard já validou o tenant do :memberId alvo), findMany precisa
 * filtrar pela organização atual manualmente aqui, com getCurrentTenantId()
 * — mesmo padrão de PrismaProfissionaisRepository (módulo agenda).
 */
@Injectable()
export class PrismaMembersRepository implements MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Member | null> {
    const member = await this.prisma.db.member.findUnique({ where: { id } });

    return member ? PrismaMemberMapper.toDomain(member) : null;
  }

  async findMany({
    page,
    perPage,
  }: FindManyMembersParams): Promise<PaginatedResult<Member>> {
    const where = { organizationId: getCurrentTenantId() };

    const [members, total] = await Promise.all([
      this.prisma.db.member.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.db.member.count({ where }),
    ]);

    return {
      items: members.map((member) => PrismaMemberMapper.toDomain(member)),
      total,
      page,
      perPage,
    };
  }

  async save(member: Member): Promise<Member> {
    const updated = await this.prisma.db.member.update({
      where: { id: member.id.toValue() },
      data: PrismaMemberMapper.toPrismaUpdate(member),
    });

    return PrismaMemberMapper.toDomain(updated);
  }
}
