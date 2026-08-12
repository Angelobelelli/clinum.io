import { Injectable } from '@nestjs/common';
import { GoogleCalendarConnectionsRepository } from '@/modules/google-calendar/application/repositories/google-calendar-connections-repository';
import { GoogleCalendarConnection } from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';

export interface ListGoogleCalendarConnectionsUseCaseResponse {
  connections: GoogleCalendarConnection[];
}

@Injectable()
export class ListGoogleCalendarConnectionsUseCase {
  constructor(
    private readonly connectionsRepository: GoogleCalendarConnectionsRepository,
  ) {}

  async execute(): Promise<ListGoogleCalendarConnectionsUseCaseResponse> {
    const connections = await this.connectionsRepository.findMany();
    return { connections };
  }
}
