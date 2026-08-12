import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { verifyState } from '@/core/crypto/signed-state';
import { env } from '@/core/env/env';
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation.pipe';
import { SkipTenantMatch } from '@/infra/tenant/skip-tenant-match.decorator';
import { runWithTenantContext } from '@/infra/tenant/tenant-context';
import { HandleGoogleOauthCallbackUseCase } from '@/modules/google-calendar/application/use-cases/handle-google-oauth-callback';
import { googleOAuthCallbackQuerySchema } from '@/modules/google-calendar/dto/google-oauth-callback-query.schema';
import type { GoogleOAuthCallbackQueryInput } from '@/modules/google-calendar/dto/google-oauth-callback-query.schema';
import { GoogleCalendarConnectionPresenter } from '@/modules/google-calendar/infra/http/presenters/google-calendar-connection-presenter';

interface GoogleOAuthState {
  organizationId: string;
  memberId: string;
}

/**
 * Rota "pré-tenant": o Google não conhece subdomínio/domínio de tenant, só
 * volta pra GOOGLE_OAUTH_REDIRECT_URI com code+state — por isso fica fora
 * de TenantMiddleware (ver exclude em app.module.ts) e usa
 * @SkipTenantMatch() (defesa em profundidade: o Google nunca manda sessão
 * better-auth, então TenantMatchGuard já passaria direto de qualquer
 * jeito). organizationId vem do `state` assinado (ver
 * StartGoogleCalendarOAuthController), não do domínio.
 */
@Controller('google-calendar/oauth')
export class GoogleOAuthCallbackController {
  constructor(
    private readonly handleGoogleOauthCallbackUseCase: HandleGoogleOauthCallbackUseCase,
  ) {}

  @Get('callback')
  @SkipTenantMatch()
  async callback(
    @Query(new ZodValidationPipe(googleOAuthCallbackQuerySchema))
    query: GoogleOAuthCallbackQueryInput,
  ) {
    let state: GoogleOAuthState;
    try {
      state = verifyState<GoogleOAuthState>(
        query.state,
        env.BETTER_AUTH_SECRET,
      );
    } catch {
      throw new BadRequestException('State do OAuth inválido ou expirado.');
    }

    const { connection } = await runWithTenantContext(
      { organizationId: state.organizationId },
      () =>
        this.handleGoogleOauthCallbackUseCase.execute({
          memberId: state.memberId,
          code: query.code,
        }),
    );

    return GoogleCalendarConnectionPresenter.toHTTP(connection);
  }
}
