import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { signState } from '@/core/crypto/signed-state';
import { env } from '@/core/env/env';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import type { PermissionRequest } from '@/infra/auth/permission-request';
import { getCurrentTenantId } from '@/infra/tenant/tenant-context';
import { StartGoogleCalendarOAuthUseCase } from '@/modules/google-calendar/application/use-cases/start-google-calendar-oauth';

/** 10 minutos — tempo mais que suficiente para o profissional passar pela tela de consentimento do Google. */
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

@Controller('google-calendar/oauth')
export class StartGoogleCalendarOAuthController {
  constructor(
    private readonly startGoogleCalendarOAuthUseCase: StartGoogleCalendarOAuthUseCase,
  ) {}

  @Get('start')
  @RequirePermission('google_calendar', 'connect')
  start(@Req() req: PermissionRequest, @Res() res: Response): void {
    // Sem :memberId na rota — SEMPRE a própria conta do caller. É isso que
    // garante estruturalmente que "só o próprio member conecta a própria
    // conta" (ver access-control.ts), não uma checagem de ownership.
    const state = signState(
      {
        organizationId: getCurrentTenantId(),
        memberId: req.callerMember!.id,
      },
      env.BETTER_AUTH_SECRET,
      OAUTH_STATE_TTL_MS,
    );

    const { authUrl } = this.startGoogleCalendarOAuthUseCase.execute({ state });

    res.redirect(authUrl);
  }
}
