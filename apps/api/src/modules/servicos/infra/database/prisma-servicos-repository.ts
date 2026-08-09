import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '@/core/pagination/paginated-result';
import { TenantScopedPrismaService } from '@/infra/database/tenant-scoped-prisma.service';
import {
  FindManyServicosFilter,
  ServicosRepository,
} from '@/modules/servicos/application/repositories/servicos-repository';
import { Servico } from '@/modules/servicos/enterprise/entities/servico';
import { PrismaServicoMapper } from './mappers/prisma-servico-mapper';

@Injectable()
export class PrismaServicosRepository implements ServicosRepository {
  constructor(private readonly tenantPrisma: TenantScopedPrismaService) {}

  async create(servico: Servico): Promise<void> {
    await this.tenantPrisma.db.servico.create({
      data: PrismaServicoMapper.toPrismaCreate(servico),
    });
  }

  async findById(id: string): Promise<Servico | null> {
    const servico = await this.tenantPrisma.db.servico.findUnique({
      where: { id },
    });

    return servico ? PrismaServicoMapper.toDomain(servico) : null;
  }

  async findMany({
    ativo,
    page,
    perPage,
  }: FindManyServicosFilter): Promise<PaginatedResult<Servico>> {
    const where = ativo === undefined ? {} : { ativo };

    const [servicos, total] = await Promise.all([
      this.tenantPrisma.db.servico.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'asc' },
      }),
      this.tenantPrisma.db.servico.count({ where }),
    ]);

    return {
      items: servicos.map((servico) => PrismaServicoMapper.toDomain(servico)),
      total,
      page,
      perPage,
    };
  }

  async save(servico: Servico): Promise<void> {
    await this.tenantPrisma.db.servico.update({
      where: { id: servico.id.toValue() },
      data: PrismaServicoMapper.toPrismaUpdate(servico),
    });
  }
}
