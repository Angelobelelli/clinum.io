import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma.service';
import { getCurrentTenantId } from '../../../../core/tenant/tenant-context';
import { ProfissionaisRepository } from '../../application/repositories/profissionais-repository';

/**
 * Member (profissionalId) não é tenant-scoped (ver members module —
 * conexão superuser), então o filtro por organização precisa ser manual
 * aqui, com getCurrentTenantId() — mesmo padrão de AgendaService original.
 */
@Injectable()
export class PrismaProfissionaisRepository implements ProfissionaisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsInCurrentOrganization(profissionalId: string): Promise<boolean> {
    const tenantId = getCurrentTenantId();
    const profissional = await this.prisma.db.member.findUnique({
      where: { id: profissionalId },
    });

    return !!profissional && profissional.organizationId === tenantId;
  }
}
