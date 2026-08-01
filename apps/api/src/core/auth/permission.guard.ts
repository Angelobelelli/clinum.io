import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth';
import { roleByName } from './access-control';
import { PrismaService } from '../database/prisma.service';
import { getCurrentTenantId } from '../tenant/tenant-context';
import {
  PERMISSION_KEY,
  type RequiredPermission,
} from './permission.decorator';
import type { PermissionRequest } from './permission-request';

/**
 * Guard genérico de permissão por papel (RBAC via better-auth ac/roles) —
 * substitui os guards individuais por módulo (PatientPermissionGuard,
 * AgendaPermissionGuard, etc.), que repetiam a mesma lógica de checagem
 * trocando só o resource. Registrado globalmente (ver app.module.ts).
 *
 * Só decide AUTORIZAÇÃO por papel — não sabe nada sobre um :id específico
 * nem sobre restrições de "próprio recurso" (ex: staff só acessa os
 * próprios agendamentos). Isso continua sendo responsabilidade da camada
 * de aplicação (ver agenda-ownership-policy.ts) — o sistema ac do
 * better-auth é boolean por papel, não modela restrição de linha, e não
 * faz sentido empurrar isso pra cá (o guard roda antes de qualquer :id
 * ser resolvido/carregado).
 *
 * Rotas SEM @RequirePermission passam direto — necessário porque este
 * guard é global e cobre toda a aplicação, inclusive rotas que nunca
 * tiveram um guard de permissão por resource (auth, organizations, members,
 * platform-admin, etc.), que continuam com seus próprios guards.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      RequiredPermission | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!required) {
      return true;
    }

    const req = context.switchToHttp().getRequest<PermissionRequest>();

    const authSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!authSession) {
      throw new UnauthorizedException('Autenticação necessária.');
    }

    const tenantId = getCurrentTenantId();
    const callerMember = await this.prisma.db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tenantId,
          userId: authSession.user.id,
        },
      },
    });

    if (!callerMember) {
      throw new ForbiddenException('Você não é membro desta organização.');
    }

    const role = roleByName[callerMember.role as keyof typeof roleByName] as
      | {
          authorize: (request: Record<string, string[]>) => {
            success: boolean;
          };
        }
      | undefined;

    const authorized = role?.authorize({
      [required.resource]: [required.action],
    });

    if (!authorized?.success) {
      throw new ForbiddenException('Você não tem permissão para essa ação.');
    }

    req.callerMember = {
      id: callerMember.id,
      role: callerMember.role,
      userId: authSession.user.id,
    };

    return true;
  }
}
