import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { TenantScopedPrismaService } from '../../core/database/tenant-scoped-prisma.service';
import type { CreatePatientInput } from './dto/create-patient.schema';
import type { UpdatePatientInput } from './dto/update-patient.schema';
import type { UpsertHealthRecordInput } from './dto/upsert-health-record.schema';

// organizationId placeholder: sempre sobrescrito em runtime por
// prisma-tenant.extension.ts ($allOperations injeta o tenant atual em todo
// `create`) — o tipo gerado pelo Prisma não sabe disso em tempo de
// compilação e exige o campo mesmo assim, então preenchemos com uma string
// vazia só pra satisfazer o tipo.
const ORGANIZATION_ID_PLACEHOLDER = '';

@Injectable()
export class PatientsService {
  constructor(private readonly tenantPrisma: TenantScopedPrismaService) {}

  /**
   * Cria Patient + PatientHealthRecord (vazio) em 2 passos sequenciais, não
   * numa única transação externa — de propósito. Cada operação no client
   * tenant-scoped já abre sua própria transação internamente (SET LOCAL +
   * insert, ver prisma-tenant.extension.ts); aninhar isso dentro de uma
   * transação externa não foi testado e arrisca abrir conexões diferentes
   * pro SET LOCAL e pro INSERT real. healthRecord é opcional no schema
   * (Patient.healthRecord?), então um Patient momentaneamente sem
   * PatientHealthRecord (só se o processo cair entre os dois passos) não é
   * um estado inválido — é só "sem ficha de saúde ainda".
   */
  async create(dto: CreatePatientInput) {
    const patient = await this.tenantPrisma.db.patient.create({
      data: {
        organizationId: ORGANIZATION_ID_PLACEHOLDER,
        nome: dto.nome,
        cpf: dto.cpf,
        telefone: dto.telefone,
        email: dto.email,
        dataNascimento: dto.dataNascimento,
        dadosVerticais: dto.dadosVerticais as Prisma.InputJsonValue | undefined,
      },
    });

    await this.tenantPrisma.db.patientHealthRecord.create({
      data: {
        organizationId: ORGANIZATION_ID_PLACEHOLDER,
        patientId: patient.id,
      },
    });

    return patient;
  }

  async findMany() {
    return this.tenantPrisma.db.patient.findMany();
  }

  async findOne(patientId: string) {
    const patient = await this.tenantPrisma.db.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    return patient;
  }

  async update(patientId: string, dto: UpdatePatientInput) {
    await this.findOne(patientId);

    return this.tenantPrisma.db.patient.update({
      where: { id: patientId },
      data: {
        ...dto,
        dadosVerticais: dto.dadosVerticais as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async remove(patientId: string): Promise<void> {
    await this.findOne(patientId);
    await this.tenantPrisma.db.patient.delete({ where: { id: patientId } });
  }

  async findHealthRecord(patientId: string) {
    await this.findOne(patientId);

    const record = await this.tenantPrisma.db.patientHealthRecord.findFirst({
      where: { patientId },
    });

    if (!record) {
      throw new NotFoundException('Ficha de saúde não encontrada.');
    }

    return record;
  }

  async updateHealthRecord(patientId: string, dto: UpsertHealthRecordInput) {
    const record = await this.findHealthRecord(patientId);

    return this.tenantPrisma.db.patientHealthRecord.update({
      where: { id: record.id },
      data: dto,
    });
  }
}
