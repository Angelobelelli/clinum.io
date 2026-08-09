import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../core/pagination/paginated-result';
import { TenantScopedPrismaService } from '../../../../infra/database/tenant-scoped-prisma.service';
import {
  FindManyPatientsParams,
  PatientsRepository,
} from '../../application/repositories/patients-repository';
import { Patient } from '../../enterprise/entities/patient';
import { PrismaPatientMapper } from './mappers/prisma-patient-mapper';

@Injectable()
export class PrismaPatientsRepository implements PatientsRepository {
  constructor(private readonly tenantPrisma: TenantScopedPrismaService) {}

  async findById(id: string): Promise<Patient | null> {
    const patient = await this.tenantPrisma.db.patient.findUnique({
      where: { id },
    });

    return patient ? PrismaPatientMapper.toDomain(patient) : null;
  }

  async findMany({
    page,
    perPage,
  }: FindManyPatientsParams): Promise<PaginatedResult<Patient>> {
    const [patients, total] = await Promise.all([
      this.tenantPrisma.db.patient.findMany({
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'asc' },
      }),
      this.tenantPrisma.db.patient.count(),
    ]);

    return {
      items: patients.map((patient) => PrismaPatientMapper.toDomain(patient)),
      total,
      page,
      perPage,
    };
  }

  async create(patient: Patient): Promise<Patient> {
    const created = await this.tenantPrisma.db.patient.create({
      data: PrismaPatientMapper.toPrismaCreate(patient),
    });

    return PrismaPatientMapper.toDomain(created);
  }

  async save(patient: Patient): Promise<Patient> {
    const updated = await this.tenantPrisma.db.patient.update({
      where: { id: patient.id.toValue() },
      data: PrismaPatientMapper.toPrismaUpdate(patient),
    });

    return PrismaPatientMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.tenantPrisma.db.patient.delete({ where: { id } });
  }
}
