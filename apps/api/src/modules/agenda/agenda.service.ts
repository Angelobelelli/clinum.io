import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgendamentoStatus,
  type Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantScopedPrismaService } from '../../core/database/tenant-scoped-prisma.service';
import { getCurrentTenantId } from '../../core/tenant/tenant-context';
import type { AgendaCallerMember } from './agenda-permission-request';
import { encontrarConflitoDeHorario } from './domain/check-agendamento-overlap';
import type { CreateAgendamentoInput } from './dto/create-agendamento.schema';
import type { ReverterAgendamentoInput } from './dto/reverter-agendamento.schema';
import type { UpdateAgendamentoStatusInput } from './dto/update-agendamento-status.schema';
import type { UpdateAgendamentoInput } from './dto/update-agendamento.schema';

// organizationId placeholder: sempre sobrescrito em runtime por
// prisma-tenant.extension.ts (ver mesmo padrão em patients.service.ts).
const ORGANIZATION_ID_PLACEHOLDER = '';

/** Status que "ocupam" o horário do profissional — ver check-agendamento-overlap.ts. */
const STATUS_QUE_BLOQUEIAM_HORARIO: AgendamentoStatus[] = [
  AgendamentoStatus.agendado,
  AgendamentoStatus.confirmado,
];

/**
 * Estados terminais: uma vez que um agendamento chega aqui, os endpoints
 * normais (update/cancelar/status) não podem mais alterá-lo — só
 * AgendaService.reverter() pode, e só de volta pra agendado/confirmado
 * (nunca outro estado terminal). Ver assertNaoTerminal().
 */
const ESTADOS_TERMINAIS: AgendamentoStatus[] = [
  AgendamentoStatus.cancelado,
  AgendamentoStatus.realizado,
  AgendamentoStatus.falta,
];

export interface FindManyAgendamentosFilter {
  data?: string;
  profissionalId?: string;
}

/**
 * Regras de negócio de agendamento: choque de horário (delegado ao domain,
 * ver domain/check-agendamento-overlap.ts) e a restrição de "próprio
 * recurso" de staff (profissionalId === o próprio Member) — ver nota em
 * access-control.ts sobre por que essa segunda parte não está no guard.
 */
@Injectable()
export class AgendaService {
  constructor(
    private readonly tenantPrisma: TenantScopedPrismaService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateAgendamentoInput, caller: AgendaCallerMember) {
    this.assertOwnResourceOrThrow(caller, dto.profissionalId);
    await this.assertProfissionalValido(dto.profissionalId);
    await this.assertPatientValido(dto.patientId);
    await this.assertSemConflito(
      dto.profissionalId,
      dto.dataHoraInicio,
      dto.dataHoraFim,
    );

    return this.tenantPrisma.db.agendamento.create({
      data: {
        organizationId: ORGANIZATION_ID_PLACEHOLDER,
        patientId: dto.patientId,
        profissionalId: dto.profissionalId,
        dataHoraInicio: dto.dataHoraInicio,
        dataHoraFim: dto.dataHoraFim,
        observacao: dto.observacao,
      },
    });
  }

  async findMany(
    caller: AgendaCallerMember,
    filter: FindManyAgendamentosFilter,
  ) {
    const where: Prisma.AgendamentoWhereInput = {};

    // staff só vê os próprios agendamentos, automaticamente — nunca falha
    // com 403, apenas filtra (diferente de findOne, onde acessar por ID o
    // agendamento de outro profissional é uma violação explícita).
    if (this.isStaff(caller)) {
      where.profissionalId = caller.id;
    } else if (filter.profissionalId) {
      where.profissionalId = filter.profissionalId;
    }

    if (filter.data) {
      const inicioDoDia = new Date(`${filter.data}T00:00:00.000Z`);
      const fimDoDia = new Date(`${filter.data}T23:59:59.999Z`);
      where.dataHoraInicio = { gte: inicioDoDia, lte: fimDoDia };
    }

    return this.tenantPrisma.db.agendamento.findMany({
      where,
      orderBy: { dataHoraInicio: 'asc' },
    });
  }

  async findOne(id: string, caller: AgendaCallerMember) {
    const agendamento = await this.tenantPrisma.db.agendamento.findUnique({
      where: { id },
    });

    if (!agendamento) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    this.assertOwnResourceOrThrow(caller, agendamento.profissionalId);

    return agendamento;
  }

  async update(
    id: string,
    dto: UpdateAgendamentoInput,
    caller: AgendaCallerMember,
  ) {
    const existing = await this.findOne(id, caller);
    this.assertNaoTerminal(existing.status);

    const novoProfissionalId = dto.profissionalId ?? existing.profissionalId;
    // Reforça a mesma restrição na remarcação: staff não pode reatribuir um
    // agendamento pra outro profissional nem mexer no de outro profissional.
    this.assertOwnResourceOrThrow(caller, novoProfissionalId);

    if (dto.profissionalId && dto.profissionalId !== existing.profissionalId) {
      await this.assertProfissionalValido(dto.profissionalId);
    }
    if (dto.patientId && dto.patientId !== existing.patientId) {
      await this.assertPatientValido(dto.patientId);
    }

    const novaDataInicio = dto.dataHoraInicio ?? existing.dataHoraInicio;
    const novaDataFim = dto.dataHoraFim ?? existing.dataHoraFim;
    const mudouIntervaloOuProfissional =
      dto.dataHoraInicio !== undefined ||
      dto.dataHoraFim !== undefined ||
      dto.profissionalId !== undefined;

    if (mudouIntervaloOuProfissional) {
      if (novaDataInicio >= novaDataFim) {
        throw new BadRequestException(
          'dataHoraFim deve ser depois de dataHoraInicio.',
        );
      }
      await this.assertSemConflito(
        novoProfissionalId,
        novaDataInicio,
        novaDataFim,
        id,
      );
    }

    return this.tenantPrisma.db.agendamento.update({
      where: { id },
      data: dto,
    });
  }

  async cancelar(id: string, caller: AgendaCallerMember) {
    const existing = await this.findOne(id, caller);
    this.assertNaoTerminal(existing.status);

    return this.tenantPrisma.db.agendamento.update({
      where: { id },
      data: { status: AgendamentoStatus.cancelado },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateAgendamentoStatusInput,
    caller: AgendaCallerMember,
  ) {
    const existing = await this.findOne(id, caller);
    this.assertNaoTerminal(existing.status);

    return this.tenantPrisma.db.agendamento.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  /**
   * Único jeito de tirar um agendamento de um estado terminal (cancelado/
   * realizado/falta) — exclusivo de owner/admin (ver access-control.ts,
   * resource "agendamento", ação "revert"). novoStatus só aceita
   * agendado/confirmado (garantido pelo Zod, reverter-agendamento.schema.ts)
   * — nunca cancelado, nem para um agendamento "realizado" (bloqueado por
   * essa restrição de valores aceitos, não por um if separado aqui).
   */
  async reverter(
    id: string,
    dto: ReverterAgendamentoInput,
    caller: AgendaCallerMember,
  ) {
    const existing = await this.findOne(id, caller);

    if (!ESTADOS_TERMINAIS.includes(existing.status)) {
      throw new ConflictException(
        'Este agendamento não está em estado terminal — não há o que reverter.',
      );
    }

    // O horário pode ter sido ocupado por outro agendamento enquanto este
    // estava em estado terminal — revalida antes de confirmar a reversão.
    await this.assertSemConflito(
      existing.profissionalId,
      existing.dataHoraInicio,
      existing.dataHoraFim,
      id,
    );

    const atualizado = await this.tenantPrisma.db.agendamento.update({
      where: { id },
      data: { status: dto.novoStatus },
    });

    await this.tenantPrisma.db.agendamentoAuditLog.create({
      data: {
        organizationId: ORGANIZATION_ID_PLACEHOLDER,
        agendamentoId: id,
        adminUserId: caller.userId,
        statusAnterior: existing.status,
        statusNovo: dto.novoStatus,
        motivo: dto.motivo,
      },
    });

    return atualizado;
  }

  private assertNaoTerminal(status: AgendamentoStatus): void {
    if (ESTADOS_TERMINAIS.includes(status)) {
      throw new ConflictException(
        'Agendamento em estado terminal, use o endpoint de reversão (/agendamentos/:id/reverter).',
      );
    }
  }

  private isStaff(caller: AgendaCallerMember): boolean {
    return caller.role === 'staff';
  }

  private assertOwnResourceOrThrow(
    caller: AgendaCallerMember,
    profissionalId: string,
  ): void {
    if (this.isStaff(caller) && profissionalId !== caller.id) {
      throw new ForbiddenException(
        'Você só pode acessar os próprios agendamentos.',
      );
    }
  }

  /**
   * Member (profissionalId) não é tenant-scoped (ver members.service.ts —
   * conexão superuser), então o filtro por organização precisa ser manual
   * aqui, com getCurrentTenantId().
   */
  private async assertProfissionalValido(
    profissionalId: string,
  ): Promise<void> {
    const tenantId = getCurrentTenantId();
    const profissional = await this.prisma.db.member.findUnique({
      where: { id: profissionalId },
    });

    if (!profissional || profissional.organizationId !== tenantId) {
      throw new NotFoundException(
        'Profissional não encontrado nesta organização.',
      );
    }
  }

  private async assertPatientValido(patientId: string): Promise<void> {
    const patient = await this.tenantPrisma.db.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }
  }

  private async assertSemConflito(
    profissionalId: string,
    dataHoraInicio: Date,
    dataHoraFim: Date,
    excludeId?: string,
  ): Promise<void> {
    const existentes = await this.tenantPrisma.db.agendamento.findMany({
      where: {
        profissionalId,
        status: { in: STATUS_QUE_BLOQUEIAM_HORARIO },
      },
    });

    const conflito = encontrarConflitoDeHorario(
      { id: excludeId, dataHoraInicio, dataHoraFim },
      existentes,
    );

    if (conflito) {
      throw new ConflictException(
        'Já existe um agendamento para este profissional nesse horário.',
      );
    }
  }
}
