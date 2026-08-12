import { GoogleCalendarConnection } from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';

export abstract class GoogleCalendarConnectionsRepository {
  /** Tenant-scoped — usado pelo processamento do webhook (já dentro do runWithTenantContext montado pelo processor a partir do job). */
  abstract findById(id: string): Promise<GoogleCalendarConnection | null>;

  abstract findByMemberId(
    memberId: string,
  ): Promise<GoogleCalendarConnection | null>;

  /**
   * Todas as conexões da organização atual — sem paginação de propósito
   * (uma linha por profissional conectado, volume esperado baixo mesmo em
   * clínicas grandes). Usado por ListGoogleCalendarConnectionsUseCase.
   */
  abstract findMany(): Promise<GoogleCalendarConnection[]>;

  /**
   * CROSS-TENANT — usado pelo webhook do Google (ver
   * GoogleCalendarWebhookController) para identificar a organização/
   * profissional ANTES de existir tenant resolvido, a partir do
   * watchChannelId recebido no header da notificação. Implementação usa o
   * client Prisma cru (PrismaService), nunca o tenant-scoped — mesmo
   * problema de ovo-e-galinha do TenantMiddleware com "organization" (ver
   * PrismaGoogleCalendarConnectionsRepository).
   */
  abstract findByWatchChannelId(
    watchChannelId: string,
  ): Promise<GoogleCalendarConnection | null>;

  /**
   * CROSS-TENANT — usado pelo job diário de renovação de canal (ver
   * RenewGoogleCalendarWatchChannelsUseCase), que varre conexões de TODAS
   * as organizações cujo canal está perto de expirar.
   */
  abstract findManyWithWatchExpiringBefore(
    expiresAt: Date,
  ): Promise<GoogleCalendarConnection[]>;

  abstract create(
    connection: GoogleCalendarConnection,
  ): Promise<GoogleCalendarConnection>;

  abstract save(
    connection: GoogleCalendarConnection,
  ): Promise<GoogleCalendarConnection>;

  abstract delete(id: string): Promise<void>;
}
