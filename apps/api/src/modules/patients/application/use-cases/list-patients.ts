import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../core/pagination/paginated-result';
import { Patient } from '../../enterprise/entities/patient';
import { PatientsRepository } from '../repositories/patients-repository';

export interface ListPatientsUseCaseRequest {
  page: number;
  perPage: number;
}

export type ListPatientsUseCaseResponse = PaginatedResult<Patient>;

/**
 * Sem erro de negócio esperado — não usa Either (ver create-patient.ts).
 * O isolamento por tenant já é garantido pelo TenantScopedPrismaService via
 * PrismaPatientsRepository.
 */
@Injectable()
export class ListPatientsUseCase {
  constructor(private readonly patientsRepository: PatientsRepository) {}

  async execute(
    request: ListPatientsUseCaseRequest,
  ): Promise<ListPatientsUseCaseResponse> {
    return this.patientsRepository.findMany(request);
  }
}
