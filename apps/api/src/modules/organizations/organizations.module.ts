import { Module } from '@nestjs/common';
import { OrganizationsRepository } from '@/modules/organizations/application/repositories/organizations-repository';
import { CreateOrganizationUseCase } from '@/modules/organizations/application/use-cases/create-organization';
import { GetCurrentOrganizationUseCase } from '@/modules/organizations/application/use-cases/get-current-organization';
import { PrismaOrganizationsRepository } from '@/modules/organizations/infra/database/prisma-organizations-repository';
import { CreateOrganizationController } from '@/modules/organizations/infra/http/controllers/create-organization.controller';
import { GetCurrentOrganizationController } from '@/modules/organizations/infra/http/controllers/get-current-organization.controller';

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
