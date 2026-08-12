import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SkipTenantMatch } from '@/infra/tenant/skip-tenant-match.decorator';
import { AcknowledgeGoogleCalendarWebhookUseCase } from '@/modules/google-calendar/application/use-cases/acknowledge-google-calendar-webhook';
import { googleCalendarErrorToHttpException } from '@/modules/google-calendar/infra/http/google-calendar-error-mapper';

/**
 * Rota "pré-tenant": o Google não manda sessão/domínio de tenant, só os
 * headers X-Goog-* — por isso fica fora de TenantMiddleware (ver exclude
 * em app.module.ts) e usa @SkipTenantMatch() pelo mesmo racional de
 * GoogleOAuthCallbackController. Sem @RequirePermission — PermissionGuard
 * já deixa passar rotas sem essa metadata (ver permission.guard.ts);
 * autenticidade vem do X-Goog-Channel-Token comparado ao
 * watchChannelToken salvo (ver AcknowledgeGoogleCalendarWebhookUseCase).
 *
 * Só a parte SÍNCRONA (identificar conexão + autenticar) acontece aqui —
 * o processamento pesado (fetch de eventos, reconciliação) é enfileirado
 * e tratado por ProcessGoogleCalendarWebhookNotificationUseCase via
 * GoogleCalendarWebhookProcessor.
 */
@Controller('google-calendar/webhook')
export class GoogleCalendarWebhookController {
  constructor(
    private readonly acknowledgeWebhookUseCase: AcknowledgeGoogleCalendarWebhookUseCase,
  ) {}

  @Post()
  @SkipTenantMatch()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Headers('x-goog-channel-id') watchChannelId: string | undefined,
    @Headers('x-goog-channel-token') watchChannelToken: string | undefined,
    @Headers('x-goog-resource-state') resourceState: string | undefined,
  ): Promise<void> {
    if (!watchChannelId) {
      throw googleCalendarErrorToHttpException(
        new Error('X-Goog-Channel-Id ausente.'),
      );
    }

    const result = await this.acknowledgeWebhookUseCase.execute({
      watchChannelId,
      watchChannelToken,
      resourceState: resourceState ?? 'exists',
    });

    if (result.isLeft()) {
      throw googleCalendarErrorToHttpException(result.value);
    }
  }
}
