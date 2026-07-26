import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../core/validation/zod-validation.pipe';
import type { UpdateMemberVinculoInput } from './dto/update-member-vinculo.schema';
import { updateMemberVinculoSchema } from './dto/update-member-vinculo.schema';
import { MemberOrgAdminGuard } from './member-org-admin.guard';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /**
   * Atualiza tipoVinculo/status de um Member — rota tenant-scoped normal
   * (passa por TenantMiddleware/TenantMatchGuard como qualquer outra rota
   * de negócio; NÃO tem @SkipTenantMatch, diferente de platform-admin).
   * MemberOrgAdminGuard garante que só owner/admin da organização chamam
   * isso.
   *
   * O pipe de validação é aplicado só no parâmetro @Body() (não via
   * @UsePipes() no método) — @UsePipes() no método aplicaria o schema a
   * TODOS os parâmetros, inclusive :memberId (uma string), quebrando a
   * validação.
   */
  @Patch(':memberId/vinculo')
  @UseGuards(MemberOrgAdminGuard)
  updateVinculo(
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateMemberVinculoSchema))
    dto: UpdateMemberVinculoInput,
  ) {
    return this.membersService.updateVinculo(memberId, dto);
  }
}
