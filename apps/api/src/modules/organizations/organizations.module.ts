import { Module } from '@nestjs/common';
import { OrganizationsRepository } from './application/repositories/organizations-repository';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization';
import { GetCurrentOrganizationUseCase } from './application/use-cases/get-current-organization';
import { PrismaOrganizationsRepository } from './infra/database/prisma-organizations-repository';
import { CreateOrganizationController } from './infra/http/controllers/create-organization.controller';
import { GetCurrentOrganizationController } from './infra/http/controllers/get-current-organization.controller';

@Module({
  controllers: [CreateOrganizationController, GetCurrentOrganizationController],
  providers: [
    {
      provide: OrganizationsRepository,
      useClass: PrismaOrganizationsRepository,
    },
    CreateOrganizationUseCase,
    GetCurrentOrganizationUseCase,
  ],
})
export class OrganizationsModule {}
