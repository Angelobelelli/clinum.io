import { NotFoundException } from '@nestjs/common';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';

/**
 * Compartilhado pelos controllers de servicos (um por ação, ver
 * infra/http/controllers/) — mesmo racional de
 * patients/infra/http/patient-error-mapper.ts.
 */
export function servicoErrorToHttpException(
  error: ServicoNotFoundError,
): NotFoundException {
  return new NotFoundException(error.message);
}
