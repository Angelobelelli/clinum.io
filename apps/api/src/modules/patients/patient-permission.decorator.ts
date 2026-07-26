import { SetMetadata } from '@nestjs/common';
import type { statement } from '../../core/auth/access-control';

export const PATIENT_PERMISSION_KEY = 'patientPermission';

export type PatientAction = (typeof statement.patient)[number];

/**
 * Marca uma rota do módulo patients com a ação exigida (ver resource
 * "patient" em access-control.ts) — lido por PatientPermissionGuard, que
 * checa se o papel do member que está chamando (owner/admin/staff/
 * reception) autoriza essa ação.
 */
export const RequirePatientPermission = (
  action: PatientAction,
): ReturnType<typeof SetMetadata> =>
  SetMetadata(PATIENT_PERMISSION_KEY, action);
