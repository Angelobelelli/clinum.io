import { Module } from '@nestjs/common';
import { MembersRepository } from './application/repositories/members-repository';
import { ListMembersUseCase } from './application/use-cases/list-members';
import { UpdateMemberVinculoUseCase } from './application/use-cases/update-member-vinculo';
import { PrismaMembersRepository } from './infra/database/prisma-members-repository';
import { ListMembersController } from './infra/http/controllers/list-members.controller';
import { UpdateMemberVinculoController } from './infra/http/controllers/update-member-vinculo.controller';
import { MemberOrgAdminGuard } from './member-org-admin.guard';
import { MembersReadGuard } from './members-read.guard';

@Module({
  controllers: [ListMembersController, UpdateMemberVinculoController],
  providers: [
    MemberOrgAdminGuard,
    MembersReadGuard,
    { provide: MembersRepository, useClass: PrismaMembersRepository },
    ListMembersUseCase,
    UpdateMemberVinculoUseCase,
  ],
})
export class MembersModule {}
