import { Controller, Delete, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import type { PermissionRequest } from '@/infra/auth/permission-request';
import { DisconnectGoogleCalendarUseCase } from '@/modules/google-calendar/application/use-cases/disconnect-google-calendar';
import { googleCalendarErrorToHttpException } from '@/modules/google-calendar/infra/http/google-calendar-error-mapper';

@Controller('google-calendar')
export class DisconnectGoogleCalendarController {
  constructor(
    private readonly disconnectGoogleCalendarUseCase: DisconnectGoogleCalendarUseCase,
  ) {}

  @Delete('connection')
  @RequirePermission('google_calendar', 'disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@Req() req: PermissionRequest): Promise<void> {
    // Sem :memberId — sempre a própria conta do caller, mesmo racional de
    // StartGoogleCalendarOAuthController.
    const result = await this.disconnectGoogleCalendarUseCase.execute({
      memberId: req.callerMember!.id,
    });

    if (result.isLeft()) {
      throw googleCalendarErrorToHttpException(result.value);
    }
  }
}
