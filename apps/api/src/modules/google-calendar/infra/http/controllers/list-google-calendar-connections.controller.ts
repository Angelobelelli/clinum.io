import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '@/infra/auth/permission.decorator';
import { ListGoogleCalendarConnectionsUseCase } from '@/modules/google-calendar/application/use-cases/list-google-calendar-connections';
import { GoogleCalendarConnectionPresenter } from '@/modules/google-calendar/infra/http/presenters/google-calendar-connection-presenter';

@Controller('google-calendar')
export class ListGoogleCalendarConnectionsController {
  constructor(
    private readonly listGoogleCalendarConnectionsUseCase: ListGoogleCalendarConnectionsUseCase,
  ) {}

  @Get('connections')
  @RequirePermission('google_calendar', 'read')
  async list() {
    const { connections } =
      await this.listGoogleCalendarConnectionsUseCase.execute();

    return connections.map((connection) =>
      GoogleCalendarConnectionPresenter.toHTTP(connection),
    );
  }
}
