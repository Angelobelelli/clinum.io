import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ADMIN_ACTION_KEY = 'platformAdminAction';

/**
 * Marca uma rota do módulo platform-admin com o nome da ação a ser gravada
 * em AdminAuditLog (ex: "list_organizations", "ban_user", "impersonate")
 * quando ela for chamada com sucesso. Lido por
 * PlatformAdminAuditInterceptor.
 */
export const PlatformAdminAction = (
  action: string,
): ReturnType<typeof SetMetadata> =>
  SetMetadata(PLATFORM_ADMIN_ACTION_KEY, action);
