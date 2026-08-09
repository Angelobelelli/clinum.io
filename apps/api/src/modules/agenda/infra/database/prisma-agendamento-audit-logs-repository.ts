import { Injectable } from '@nestjs/common';
import { TenantScopedPrismaService } from '@/infra/database/tenant-scoped-prisma.service';
import { AgendamentoAuditLog } from '@/modules/agenda/enterprise/entities/agendamento-audit-log';
import { AgendamentoAuditLogsRepository } from '@/modules/agenda/application/repositories/agendamento-audit-logs-repository';
import { PrismaAgendamentoAuditLogMapper } from '@/modules/agenda/infra/database/mappers/prisma-agendamento-audit-log-mapper';

@Injectable()
export class PrismaAgendamentoAuditLogsRepository implements AgendamentoAuditLogsRepository {
  constructor(private readonly tenantPrisma: TenantScopedPrismaService) {}

  async create(log: AgendamentoAuditLog): Promise<AgendamentoAuditLog> {
    const created = await this.tenantPrisma.db.agendamentoAuditLog.create({
      data: PrismaAgendamentoAuditLogMapper.toPrismaCreate(log),
    });

    return PrismaAgendamentoAuditLogMapper.toDomain(created);
  }
}
