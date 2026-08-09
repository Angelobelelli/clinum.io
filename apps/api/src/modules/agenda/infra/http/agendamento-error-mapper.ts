import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { PatientNotFoundError } from '@/modules/patients/application/use-cases/errors/patient-not-found-error';
import { AgendamentoConflictError } from '@/modules/agenda/application/use-cases/errors/agendamento-conflict-error';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoNotTerminalError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-terminal-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';
import { InvalidAgendamentoIntervalError } from '@/modules/agenda/application/use-cases/errors/invalid-agendamento-interval-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { ProfissionalNotFoundError } from '@/modules/agenda/application/use-cases/errors/profissional-not-found-error';

/**
 * Compartilhado pelos 6 controllers de agenda (um por ação, ver
 * infra/http/controllers/) — cada use-case só pode retornar um subconjunto
 * desses erros no seu Either, mas o mapeamento pra HTTP é o mesmo em
 * qualquer lugar, então fica num só lugar em vez de repetir o switch em
 * cada controller.
 */
export function agendamentoErrorToHttpException(error: Error): HttpException {
  if (
    error instanceof AgendamentoNotFoundError ||
    error instanceof ProfissionalNotFoundError ||
    error instanceof PatientNotFoundError
  ) {
    return new NotFoundException(error.message);
  }

  if (error instanceof NotOwnAgendamentoError) {
    return new ForbiddenException(error.message);
  }

  if (error instanceof InvalidAgendamentoIntervalError) {
    return new BadRequestException(error.message);
  }

  if (
    error instanceof AgendamentoConflictError ||
    error instanceof AgendamentoTerminalStateError ||
    error instanceof AgendamentoNotTerminalError
  ) {
    return new ConflictException(error.message);
  }

  return new BadRequestException(error.message);
}
