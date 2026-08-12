import type {
  GoogleCalendarConnection as PrismaGoogleCalendarConnection,
  Prisma,
} from '@generated/prisma/client';
import { decryptToken, encryptToken } from '@/core/crypto/token-cipher';
import { env } from '@/core/env/env';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { GoogleCalendarConnection } from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';

/**
 * Fronteira da criptografia do refresh token: decripta ao sair do banco,
 * cripta ao entrar. enterprise/application nunca veem
 * refreshTokenEncrypted, só o token em texto plano (ver comentário em
 * GoogleCalendarConnectionProps.refreshToken).
 */
export class PrismaGoogleCalendarConnectionMapper {
  static toDomain(
    raw: PrismaGoogleCalendarConnection,
  ): GoogleCalendarConnection {
    return GoogleCalendarConnection.create(
      {
        organizationId: raw.organizationId,
        memberId: raw.memberId,
        googleAccountEmail: raw.googleAccountEmail,
        refreshToken: decryptToken(
          raw.refreshTokenEncrypted,
          env.GOOGLE_TOKEN_ENCRYPTION_KEY,
        ),
        calendarId: raw.calendarId,
        watchChannelId: raw.watchChannelId,
        watchChannelToken: raw.watchChannelToken,
        watchResourceId: raw.watchResourceId,
        watchExpiresAt: raw.watchExpiresAt,
        syncToken: raw.syncToken,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  // organizationId incluído só para satisfazer o tipo gerado pelo Prisma —
  // sempre sobrescrito pela extension de tenant no `create` (ver
  // prisma-tenant.extension.ts). id incluído explicitamente pelo mesmo
  // racional de PrismaServicoMapper.toPrismaCreate.
  static toPrismaCreate(
    connection: GoogleCalendarConnection,
  ): Prisma.GoogleCalendarConnectionUncheckedCreateInput {
    return {
      id: connection.id.toValue(),
      organizationId: connection.organizationId,
      memberId: connection.memberId,
      googleAccountEmail: connection.googleAccountEmail,
      refreshTokenEncrypted: encryptToken(
        connection.refreshToken,
        env.GOOGLE_TOKEN_ENCRYPTION_KEY,
      ),
      calendarId: connection.calendarId,
      watchChannelId: connection.watchChannelId,
      watchChannelToken: connection.watchChannelToken,
      watchResourceId: connection.watchResourceId,
      watchExpiresAt: connection.watchExpiresAt,
      syncToken: connection.syncToken,
    };
  }

  static toPrismaUpdate(
    connection: GoogleCalendarConnection,
  ): Prisma.GoogleCalendarConnectionUncheckedUpdateInput {
    return {
      googleAccountEmail: connection.googleAccountEmail,
      refreshTokenEncrypted: encryptToken(
        connection.refreshToken,
        env.GOOGLE_TOKEN_ENCRYPTION_KEY,
      ),
      calendarId: connection.calendarId,
      watchChannelId: connection.watchChannelId,
      watchChannelToken: connection.watchChannelToken,
      watchResourceId: connection.watchResourceId,
      watchExpiresAt: connection.watchExpiresAt,
      syncToken: connection.syncToken,
    };
  }
}
