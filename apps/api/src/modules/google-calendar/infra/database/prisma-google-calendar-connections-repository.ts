import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/database/prisma.service';
import { TenantScopedPrismaService } from '@/infra/database/tenant-scoped-prisma.service';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';
import { GoogleCalendarConnection } from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';
import { PrismaGoogleCalendarConnectionMapper } from '@/modules/google-calendar/infra/database/mappers/prisma-google-calendar-connection-mapper';

@Injectable()
export class PrismaGoogleCalendarConnectionsRepository implements GoogleCalendarConnectionsRepository {
  constructor(
    private readonly tenantPrisma: TenantScopedPrismaService,
    // Client cru (superuser, sem RLS/filtro de tenant) — usado SÓ pelos dois
    // métodos cross-tenant abaixo (findByWatchChannelId,
    // findManyWithWatchExpiringBefore). Todo o resto deste repositório usa
    // tenantPrisma normalmente. Ver comentário na abstract class.
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string): Promise<GoogleCalendarConnection | null> {
    const connection =
      await this.tenantPrisma.db.googleCalendarConnection.findUnique({
        where: { id },
      });

    return connection
      ? PrismaGoogleCalendarConnectionMapper.toDomain(connection)
      : null;
  }

  async findByMemberId(
    memberId: string,
  ): Promise<GoogleCalendarConnection | null> {
    const connection =
      await this.tenantPrisma.db.googleCalendarConnection.findUnique({
        where: { memberId },
      });

    return connection
      ? PrismaGoogleCalendarConnectionMapper.toDomain(connection)
      : null;
  }

  async findMany(): Promise<GoogleCalendarConnection[]> {
    const connections =
      await this.tenantPrisma.db.googleCalendarConnection.findMany({
        orderBy: { createdAt: 'asc' },
      });

    return connections.map((connection) =>
      PrismaGoogleCalendarConnectionMapper.toDomain(connection),
    );
  }

  async findByWatchChannelId(
    watchChannelId: string,
  ): Promise<GoogleCalendarConnection | null> {
    const connection = await this.prisma.db.googleCalendarConnection.findUnique(
      { where: { watchChannelId } },
    );

    return connection
      ? PrismaGoogleCalendarConnectionMapper.toDomain(connection)
      : null;
  }

  async findManyWithWatchExpiringBefore(
    expiresAt: Date,
  ): Promise<GoogleCalendarConnection[]> {
    const connections = await this.prisma.db.googleCalendarConnection.findMany({
      where: {
        watchExpiresAt: { not: null, lte: expiresAt },
      },
    });

    return connections.map((connection) =>
      PrismaGoogleCalendarConnectionMapper.toDomain(connection),
    );
  }

  async create(
    connection: GoogleCalendarConnection,
  ): Promise<GoogleCalendarConnection> {
    const created = await this.tenantPrisma.db.googleCalendarConnection.create({
      data: PrismaGoogleCalendarConnectionMapper.toPrismaCreate(connection),
    });

    return PrismaGoogleCalendarConnectionMapper.toDomain(created);
  }

  async save(
    connection: GoogleCalendarConnection,
  ): Promise<GoogleCalendarConnection> {
    const updated = await this.tenantPrisma.db.googleCalendarConnection.update({
      where: { id: connection.id.toValue() },
      data: PrismaGoogleCalendarConnectionMapper.toPrismaUpdate(connection),
    });

    return PrismaGoogleCalendarConnectionMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.tenantPrisma.db.googleCalendarConnection.delete({
      where: { id },
    });
  }
}
