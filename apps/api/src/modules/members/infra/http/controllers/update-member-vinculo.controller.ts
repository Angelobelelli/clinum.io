import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../../../infra/http/pipes/zod-validation.pipe';
import { UpdateMemberVinculoUseCase } from '../../../application/use-cases/update-member-vinculo';
import { updateMemberVinculoSchema } from '../../../dto/update-member-vinculo.schema';
import type { UpdateMemberVinculoInput } from '../../../dto/update-member-vinculo.schema';
import { MemberOrgAdminGuard } from '../../../member-org-admin.guard';
import { MemberPresenter } from '../presenters/member-presenter';

/**
 * Rota tenant-scoped normal (passa por TenantMiddleware/TenantMatchGuard
 * como qualquer outra rota de negócio; NÃO tem @SkipTenantMatch, diferente
 * de platform-admin). MemberOrgAdminGuard garante que só owner/admin da
 * organização chamam isso, e que :memberId pertence ao tenant atual — o
 * 404 "de verdade" (member de outro tenant ou inexistente) acontece lá, não
 * aqui.
 */
@Controller('members')
export class UpdateMemberVinculoController {
  constructor(
    private readonly updateMemberVinculoUseCase: UpdateMemberVinculoUseCase,
  ) {}

  @Patch(':memberId/vinculo')
  @UseGuards(MemberOrgAdminGuard)
  async updateVinculo(
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateMemberVinculoSchema))
    dto: UpdateMemberVinculoInput,
  ) {
    const result = await this.updateMemberVinculoUseCase.execute({
      memberId,
      ...dto,
    });

    if (result.isLeft()) {
      throw new NotFoundException(result.value.message);
    }

    return MemberPresenter.toHTTP(result.value.member);
  }
}
