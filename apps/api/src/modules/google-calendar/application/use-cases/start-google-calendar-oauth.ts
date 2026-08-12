import { Injectable } from '@nestjs/common';
import { GoogleCalendarGateway } from '@/modules/google-calendar/application/ports/google-calendar-gateway';

export interface StartGoogleCalendarOAuthUseCaseRequest {
  state: string;
}

export interface StartGoogleCalendarOAuthUseCaseResponse {
  authUrl: string;
}

@Injectable()
export class StartGoogleCalendarOAuthUseCase {
  constructor(private readonly gateway: GoogleCalendarGateway) {}

  execute({
    state,
  }: StartGoogleCalendarOAuthUseCaseRequest): StartGoogleCalendarOAuthUseCaseResponse {
    return { authUrl: this.gateway.buildAuthUrl(state) };
  }
}
