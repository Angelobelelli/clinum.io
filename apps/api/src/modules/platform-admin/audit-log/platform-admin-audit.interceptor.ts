import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, concatMap, from, map } from 'rxjs';
import { recordAdminAuditLog } from '../../../core/audit/admin-audit-log';
import type { PlatformAdminRequest } from '../platform-admin-request';
import { PLATFORM_ADMIN_ACTION_KEY } from './platform-admin-action.decorator';

/**
 * Grava em AdminAuditLog toda chamada BEM-SUCEDIDA a uma rota do módulo
 * platform-admin marcada com @PlatformAdminAction(...). Não decide
 * autorização (isso é PlatformAdminGuard, que já rodou antes e deixou a
 * sessão em req.platformAdminSession) — só registra o que já foi permitido.
 *
 * Usa `concatMap` (não `tap`) de propósito: a gravação do audit log é
 * AWAITED antes da resposta ser enviada ao cliente, para que "toda ação
 * gera um registro" seja uma garantia, não uma escrita best-effort que
 * poderia se perder se o processo caísse logo após responder.
 */
@Injectable()
export class PlatformAdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<string | undefined>(
      PLATFORM_ADMIN_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<PlatformAdminRequest>();

    return next
      .handle()
      .pipe(
        concatMap((data: unknown) =>
          from(this.logAction(req, action)).pipe(map(() => data)),
        ),
      );
  }

  private async logAction(
    req: PlatformAdminRequest,
    action: string,
  ): Promise<void> {
    const adminUserId = req.platformAdminSession?.user.id;
    if (!adminUserId) {
      return;
    }

    const params = req.params as Record<string, string | undefined>;

    await recordAdminAuditLog({
      adminUserId,
      action,
      targetOrganizationId: params.organizationId ?? null,
      targetUserId: params.userId ?? null,
    });
  }
}
