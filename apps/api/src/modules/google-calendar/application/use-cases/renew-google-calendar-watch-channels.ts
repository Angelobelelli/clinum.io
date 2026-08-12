import { Injectable } from '@nestjs/common';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';

/**
 * Canais de watch do Google expiram em até 30 dias (requisito 7) — renova
 * com essa margem de antecedência para tolerar o job não rodar num dia
 * específico sem deixar a conexão sem canal ativo.
 */
const RENEWAL_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

export interface FindExpiringGoogleCalendarWatchChannelsUseCaseResponse {
  connections: { connectionId: string; organizationId: string }[];
}

/**
 * Leitura CROSS-TENANT (varre conexões de todas as organizações) — só a
 * leitura, sem tocar no Google nem salvar nada. Consumido pelo processor
 * do job repetível diário, que depois chama RenewGoogleCalendarWatchChannelUseCase
 * (mesma pasta) uma vez por conexão, dentro do tenant certo — ver
 * infra/queue/processors/google-calendar-watch-renewal.processor.ts para o
 * porquê da separação em dois use-cases (o repositório tenant-scoped exige
 * um `organizationId` ativo em AsyncLocalStorage por chamada, e essa
 * varredura cross-tenant não tem um único tenant ativo).
 */
@Injectable()
export class FindExpiringGoogleCalendarWatchChannelsUseCase {
  constructor(
    private readonly connectionsRepository: GoogleCalendarConnectionsRepository,
  ) {}

  async execute(): Promise<FindExpiringGoogleCalendarWatchChannelsUseCaseResponse> {
    const threshold = new Date(Date.now() + RENEWAL_THRESHOLD_MS);
    const expiring =
      await this.connectionsRepository.findManyWithWatchExpiringBefore(
        threshold,
      );

    return {
      connections: expiring.map((connection) => ({
        connectionId: connection.id.toValue(),
        organizationId: connection.organizationId,
      })),
    };
  }
}
