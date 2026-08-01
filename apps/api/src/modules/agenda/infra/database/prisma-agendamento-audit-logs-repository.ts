import { Injectable } from '@nestjs/common';
import { TenantScopedPrismaService } from '../../../../core/database/tenant-scoped-prisma.service';
import { AgendamentoAuditLog } from '../../enterprise/entities/agendamento-audit-log';
import { AgendamentoAuditLogsRepository } from '../../application/repositories/agendamento-audit-logs-repository';
import { PrismaAgendamentoAuditLogMapper } from './mappers/prisma-agendamento-audit-log-mapper';

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
