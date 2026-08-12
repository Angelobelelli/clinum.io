import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import {
  GoogleCalendarConnection,
  GoogleCalendarConnectionProps,
} from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';

let sequence = 0;

export function makeGoogleCalendarConnection(
  override: Partial<GoogleCalendarConnectionProps> = {},
  id?: UniqueEntityID,
): GoogleCalendarConnection {
  sequence += 1;

  return GoogleCalendarConnection.create(
    {
      organizationId: 'org-test',
      memberId: `member-${sequence}`,
      googleAccountEmail: `profissional-${sequence}@example.com`,
      refreshToken: `refresh-token-${sequence}`,
      calendarId: 'primary',
      ...override,
    },
    id,
  );
}
