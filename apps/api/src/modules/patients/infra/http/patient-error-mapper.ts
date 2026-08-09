import { NotFoundException } from '@nestjs/common';
import { HealthRecordNotFoundError } from '@/modules/patients/application/use-cases/errors/health-record-not-found-error';
import { PatientNotFoundError } from '@/modules/patients/application/use-cases/errors/patient-not-found-error';

/**
 * Compartilhado pelos controllers de patients (um por ação, ver
 * infra/http/controllers/) — mesmo racional de
 * agenda/infra/http/agendamento-error-mapper.ts: evita repetir o mapeamento
 * erro de domínio → HTTP em cada arquivo.
 */
export function patientErrorToHttpException(
  error: PatientNotFoundError | HealthRecordNotFoundError,
): NotFoundException {
  return new NotFoundException(error.message);
}
