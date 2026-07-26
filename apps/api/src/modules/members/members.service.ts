import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateMemberVinculoInput } from './dto/update-member-vinculo.schema';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Escreve tipoVinculo/status DIRETO via Prisma Client — nunca através de
   * alguma função/endpoint do better-auth.
   *
   * IMPORTANTE: não configure tipoVinculo/status como additionalFields do
   * plugin `organization` do better-auth (auth.ts), mesmo sendo enums
   * nativos do Postgres e não sofrerem do mesmo problema de
   * role/platformRole/vertical/plano (ver nota no topo do schema.prisma).
   * A tentação de "unificar" isso no endpoint de update-member-role do
   * better-auth deve ser evitada: esses campos são conceitualmente
   * diferentes de "role" (vínculo/status operacional, não permissão) e
   * mantê-los num fluxo de escrita totalmente separado evita reacoplar essa
   * escrita a um endpoint que já tem sua própria validação/hook (ver
   * organizationHooks em auth.ts) pensada só pra `role`.
   */
  async updateVinculo(memberId: string, dto: UpdateMemberVinculoInput) {
    return this.prisma.db.member.update({
      where: { id: memberId },
      data: {
        ...(dto.tipoVinculo !== undefined
          ? { tipoVinculo: dto.tipoVinculo }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }
}
