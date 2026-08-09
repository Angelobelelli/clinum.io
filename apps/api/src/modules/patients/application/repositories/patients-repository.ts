import { PaginatedResult } from '@/core/pagination/paginated-result';
import { Patient } from '@/modules/patients/enterprise/entities/patient';

export interface FindManyPatientsParams {
  page: number;
  perPage: number;
}

/**
 * Contrato abstrato (não interface do TS) para poder ser usado como token
 * de injeção de dependência do Nest (`provide: PatientsRepository, useClass:
 * PrismaPatientsRepository`). A implementação Prisma nunca é referenciada
 * fora de infra/; use-cases só conhecem este contrato.
 */
export abstract class PatientsRepository {
  abstract findById(id: string): Promise<Patient | null>;
  abstract findMany(
    params: FindManyPatientsParams,
  ): Promise<PaginatedResult<Patient>>;
  abstract create(patient: Patient): Promise<Patient>;
  abstract save(patient: Patient): Promise<Patient>;
  abstract delete(id: string): Promise<void>;
}
