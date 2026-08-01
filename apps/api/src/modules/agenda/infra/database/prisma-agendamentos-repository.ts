import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PaginatedResult } from '../../../../core/pagination/paginated-result';
import { TenantScopedPrismaService } from '../../../../core/database/tenant-scoped-prisma.service';
import {
  Agendamento,
  STATUS_QUE_BLOQUEIAM_HORARIO,
} from '../../enterprise/entities/agendamento';
import {
  AgendamentosRepository,
  FindManyAgendamentosFilter,
} from '../../application/repositories/agendamentos-repository';
import { PrismaAgendamentoMapper } from './mappers/prisma-agendamento-mapper';

@Injectable()
export class PrismaAgendamentosRepository implements AgendamentosRepository {
  constructor(private readonly tenantPrisma: TenantScopedPrismaService) {}

  async findById(id: string): Promise<Agendamento | null> {
    const agendamento = await this.tenantPrisma.db.agendamento.findUnique({
      where: { id },
    });

    return agendamento ? PrismaAgendamentoMapper.toDomain(agendamento) : null;
  }

  async findMany(
    filter: FindManyAgendamentosFilter,
  ): Promise<PaginatedResult<Agendamento>> {
    const where: Prisma.AgendamentoWhereInput = {};

    if (filter.profissionalId) {
      where.profissionalId = filter.profissionalId;
    }
    if (filter.dataInicio && filter.dataFim) {
      where.dataHoraInicio = { gte: filter.dataInicio, lte: filter.dataFim };
    }

    const [agendamentos, total] = await Promise.all([
      this.tenantPrisma.db.agendamento.findMany({
        where,
        orderBy: { dataHoraInicio: 'asc' },
        skip: (filter.page - 1) * filter.perPage,
        take: filter.perPage,
      }),
      this.tenantPrisma.db.agendamento.count({ where }),
    ]);

    return {
      items: agendamentos.map((agendamento) =>
        PrismaAgendamentoMapper.toDomain(agendamento),
      ),
      total,
      page: filter.page,
      perPage: filter.perPage,
    };
  }

  async findManyBlockingForProfissional(
    profissionalId: string,
  ): Promise<Agendamento[]> {
    const agendamentos = await this.tenantPrisma.db.agendamento.findMany({
      where: {
        profissionalId,
        status: { in: STATUS_QUE_BLOQUEIAM_HORARIO },
      },
    });

    return agendamentos.map((agendamento) =>
      PrismaAgendamentoMapper.toDomain(agendamento),
    );
  }

  async create(agendamento: Agendamento): Promise<Agendamento> {
    const created = await this.tenantPrisma.db.agendamento.create({
      data: PrismaAgendamentoMapper.toPrismaCreate(agendamento),
    });

    return PrismaAgendamentoMapper.toDomain(created);
  }

  async save(agendamento: Agendamento): Promise<Agendamento> {
    const updated = await this.tenantPrisma.db.agendamento.update({
      where: { id: agendamento.id.toValue() },
      data: PrismaAgendamentoMapper.toPrismaUpdate(agendamento),
    });

    return PrismaAgendamentoMapper.toDomain(updated);
  }
}
