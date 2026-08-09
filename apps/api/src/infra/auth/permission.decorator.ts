import { SetMetadata } from '@nestjs/common';
import type { statement } from '@/infra/auth/access-control';

export const PERMISSION_KEY = 'permission';

export type PermissionResource = keyof typeof statement;
export type PermissionAction<R extends PermissionResource> =
  (typeof statement)[R][number];

export interface RequiredPermission {
  resource: PermissionResource;
  action: string;
}

/**
 * Marca uma rota com a ação exigida sobre um resource (ver `statement` em
 * access-control.ts) — só metadata, sem lógica de verificação. Lido por
 * PermissionGuard (registrado globalmente em app.module.ts), que resolve o
 * papel do member chamador e autoriza via better-auth ac/roles.
 *
 * Substitui os decorators por módulo (RequirePatientPermission,
 * RequireAgendaPermission, etc.) — um único decorator genérico, parametrizado
 * pelo resource.
 */
export const RequirePermission = <R extends PermissionResource>(
  resource: R,
  action: PermissionAction<R>,
): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSION_KEY, {
    resource,
    action,
  } satisfies RequiredPermission);
