import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';
import { GoogleCalendarConnection } from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';

export class InMemoryGoogleCalendarConnectionsRepository implements GoogleCalendarConnectionsRepository {
  public items: GoogleCalendarConnection[] = [];

  findById(id: string): Promise<GoogleCalendarConnection | null> {
    const connection = this.items.find((item) => item.id.toValue() === id);
    return Promise.resolve(connection ?? null);
  }

  findByMemberId(memberId: string): Promise<GoogleCalendarConnection | null> {
    const connection = this.items.find((item) => item.memberId === memberId);
    return Promise.resolve(connection ?? null);
  }

  findMany(): Promise<GoogleCalendarConnection[]> {
    return Promise.resolve([...this.items]);
  }

  findByWatchChannelId(
    watchChannelId: string,
  ): Promise<GoogleCalendarConnection | null> {
    const connection = this.items.find(
      (item) => item.watchChannelId === watchChannelId,
    );
    return Promise.resolve(connection ?? null);
  }

  findManyWithWatchExpiringBefore(
    expiresAt: Date,
  ): Promise<GoogleCalendarConnection[]> {
    const filtered = this.items.filter(
      (item) => !!item.watchExpiresAt && item.watchExpiresAt <= expiresAt,
    );
    return Promise.resolve(filtered);
  }

  create(
    connection: GoogleCalendarConnection,
  ): Promise<GoogleCalendarConnection> {
    this.items.push(connection);
    return Promise.resolve(connection);
  }

  save(
    connection: GoogleCalendarConnection,
  ): Promise<GoogleCalendarConnection> {
    const index = this.items.findIndex(
      (item) => item.id.toValue() === connection.id.toValue(),
    );
    if (index >= 0) {
      this.items[index] = connection;
    }
    return Promise.resolve(connection);
  }

  delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id.toValue() !== id);
    return Promise.resolve();
  }
}
