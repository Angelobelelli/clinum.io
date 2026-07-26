import { Module } from '@nestjs/common';
import { MemberOrgAdminGuard } from './member-org-admin.guard';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  controllers: [MembersController],
  providers: [MembersService, MemberOrgAdminGuard],
})
export class MembersModule {}
