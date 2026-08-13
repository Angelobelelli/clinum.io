import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { env } from '@/core/env/env';
import type { GoogleOAuthTokens } from '@/integrations/google-calendar/google-calendar-integration.types';

/**
 * Escopo de calendário: leitura/escrita de eventos do calendário do
 * profissional. Sem escopo de configurações da conta, sem readonly (a
 * sincronização é bidirecional).
 */
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

/**
 * Escopo de identidade — necessário só para o GET /oauth2/v2/userinfo em
 * exchangeCodeForTokens (usado pra preencher
 * GoogleCalendarConnection.googleAccountEmail). Sem ele, o access token
 * emitido não tem autorização pra chamar o endpoint de userinfo (401
 * "missing required authentication credential"), mesmo com o code trocado
 * com sucesso.
 */
const USERINFO_EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';

/**
 * Wrapper fino sobre OAuth2Client (google-auth-library) — fluxo de
 * autorização e obtenção do client autenticado usado pelos demais clients
 * deste pacote (events/freebusy/watch). Nenhum conceito de negócio: recebe
 * e devolve só o vocabulário do OAuth do Google.
 */
@Injectable()
export class GoogleOAuthClient {
  private createClient(): OAuth2Client {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_OAUTH_REDIRECT_URI,
    );
  }

  buildAuthUrl(state: string): string {
    return this.createClient().generateAuthUrl({
      access_type: 'offline',
      // "consent" força o Google a sempre devolver um refresh_token, mesmo
      // que o profissional já tenha autorizado o app antes — sem isso, uma
      // reconexão após revogar acesso manualmente no Google não traria um
      // refresh_token novo.
      prompt: 'consent',
      scope: [CALENDAR_SCOPE, USERINFO_EMAIL_SCOPE],
      state,
    });
  }

  async exchangeCodeForTokens(
    code: string,
  ): Promise<GoogleOAuthTokens & { googleAccountEmail: string }> {
    const client = this.createClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: client, version: 'v2' });
    const { data } = await oauth2.userinfo.get();

    if (!tokens.access_token || !tokens.expiry_date || !data.email) {
      throw new Error(
        'Resposta incompleta do Google ao trocar o código de autorização.',
      );
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date,
      googleAccountEmail: data.email,
    };
  }

  async revokeToken(refreshToken: string): Promise<void> {
    await this.createClient().revokeToken(refreshToken);
  }

  /** Client autenticado, pronto para os demais wrappers (events/freebusy/watch) chamarem a API. */
  authorizedClient(refreshToken: string): OAuth2Client {
    const client = this.createClient();
    client.setCredentials({ refresh_token: refreshToken });
    return client;
  }
}
