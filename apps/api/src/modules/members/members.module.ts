import { Module } from '@nestjs/common';
import { MembersRepository } from '@/modules/members/application/repositories/members-repository';
import { ListMembersUseCase } from '@/modules/members/application/use-cases/list-members';
import { UpdateMemberVinculoUseCase } from '@/modules/members/application/use-cases/update-member-vinculo';
import { PrismaMembersRepository } from '@/modules/members/infra/database/prisma-members-repository';
import { ListMembersController } from '@/modules/members/infra/http/controllers/list-members.controller';
import { UpdateMemberVinculoController } from '@/modules/members/infra/http/controllers/update-member-vinculo.controller';
import { MemberOrgAdminGuard } from '@/modules/members/member-org-admin.guard';
import { MembersReadGuard } from '@/modules/members/members-read.guard';

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
