import { Injectable } from '@nestjs/common';
import { Either, left, right } from '../../../../core/either';
import { Organization } from '../../enterprise/entities/organization';
import { OrganizationsRepository } from '../repositories/organizations-repository';
import { OrganizationNotFoundError } from './errors/organization-not-found-error';

export interface GetCurrentOrganizationUseCaseRequest {
  organizationId: string;
}

export type GetCurrentOrganizationUseCaseResponse = Either<
  OrganizationNotFoundError,
  { organization: Organization }
>;

@Injectable()
export class GetCurrentOrganizationUseCase {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute({
    organizationId,
  }: GetCurrentOrganizationUseCaseRequest): Promise<GetCurrentOrganizationUseCaseResponse> {
    const organization =
      await this.organizationsRepository.findById(organizationId);

    if (!organization) {
      return left(new OrganizationNotFoundError());
    }

    return right({ organization });
  }
}
