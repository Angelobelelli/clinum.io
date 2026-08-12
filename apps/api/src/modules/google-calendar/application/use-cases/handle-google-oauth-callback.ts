import { Injectable } from '@nestjs/common';
import { GoogleCalendarGateway } from '@/modules/google-calendar/application/ports/google-calendar-gateway';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';
import { GoogleCalendarConnection } from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';

// organizationId placeholder: sempre sobrescrito pela extension de tenant
// no `create` (mesmo padrão de create-patient.ts/create-servico.ts).
const ORGANIZATION_ID_PLACEHOLDER = '';

export interface HandleGoogleOauthCallbackUseCaseRequest {
  memberId: string;
  code: string;
}

export interface HandleGoogleOauthCallbackUseCaseResponse {
  connection: GoogleCalendarConnection;
}

/**
 * Sem Either: qualquer falha aqui (código inválido, API do Google fora do
 * ar) é uma exceção de infra de verdade, não um erro de negócio esperado —
 * mesmo racional de use-cases sem erro de domínio (ex: ListServicosUseCase).
 */
@Injectable()
export class HandleGoogleOauthCallbackUseCase {
  constructor(
    private readonly connectionsRepository: GoogleCalendarConnectionsRepository,
    private readonly gateway: GoogleCalendarGateway,
  ) {}

  async execute(
    request: HandleGoogleOauthCallbackUseCaseRequest,
  ): Promise<HandleGoogleOauthCallbackUseCaseResponse> {
    const { refreshToken, googleAccountEmail } =
      await this.gateway.exchangeCodeForTokens(request.code);

    let connection = await this.connectionsRepository.findByMemberId(
      request.memberId,
    );

    if (connection) {
      connection.reautorizar({ refreshToken, googleAccountEmail });
      connection = await this.connectionsRepository.save(connection);
    } else {
      connection = await this.connectionsRepository.create(
        GoogleCalendarConnection.create({
          organizationId: ORGANIZATION_ID_PLACEHOLDER,
          memberId: request.memberId,
          googleAccountEmail,
          refreshToken,
          calendarId: 'primary',
        }),
      );
    }

    const watch = await this.gateway.createWatchChannel({
      refreshToken: connection.refreshToken,
      calendarId: connection.calendarId,
    });
    connection.registrarCanalWatch({
      channelId: watch.channelId,
      channelToken: watch.channelToken,
      resourceId: watch.resourceId,
      expiresAt: watch.expiresAt,
    });
    connection = await this.connectionsRepository.save(connection);

    return { connection };
  }
}
