import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { GoogleCalendarNotConnectedError } from '@/modules/google-calendar/application/use-cases/errors/google-calendar-not-connected-error';
import { InvalidWatchChannelTokenError } from '@/modules/google-calendar/application/use-cases/errors/invalid-watch-channel-token-error';
import { UnknownWatchChannelError } from '@/modules/google-calendar/application/use-cases/errors/unknown-watch-channel-error';

/** Compartilhado pelos controllers de google-calendar (um por ação, ver infra/http/controllers/). */
export function googleCalendarErrorToHttpException(
  error: Error,
): HttpException {
  if (
    error instanceof GoogleCalendarNotConnectedError ||
    error instanceof UnknownWatchChannelError
  ) {
    return new NotFoundException(error.message);
  }

  if (error instanceof InvalidWatchChannelTokenError) {
    return new ForbiddenException(error.message);
  }

  return new BadRequestException(error.message);
}
