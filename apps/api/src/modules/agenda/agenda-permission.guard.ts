import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../core/auth/auth';
import { roleByName } from '../../core/auth/access-control';
import { PrismaService } from '../../core/database/prisma.service';
import { getCurrentTenantId } from '../../core/tenant/tenant-context';
import {
  AGENDA_PERMISSION_KEY,
  type AgendamentoAction,
} from './agenda-permission.decorator';
import type { AgendaPermissionRequest } from './agenda-permission-request';

/**
 * Gate de permissão para o resource "agendamento" (ver access-control.ts).
 * Igual a PatientPermissionGuard (modules/patients/): só decide
 * AUTORIZAÇÃO por papel — não sabe nada sobre um :id específico nem sobre
 * a restrição de "próprio recurso" de staff (isso é responsabilidade de
 * AgendaService, que recebe o agendaCallerMember anexado aqui).
 */
@Injectable()
export class AgendaPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AgendaPermissionRequest>();

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

    const action = this.reflector.getAllAndOverride<
      AgendamentoAction | undefined
    >(AGENDA_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    const role = roleByName[callerMember.role as keyof typeof roleByName] as
      | {
          authorize: (request: { agendamento: AgendamentoAction[] }) => {
            success: boolean;
          };
        }
      | undefined;

    const authorized = action
      ? role?.authorize({ agendamento: [action] })
      : undefined;

    if (!authorized?.success) {
      throw new ForbiddenException(
        'Você não tem permissão para essa ação sobre agendamentos.',
      );
    }

    req.agendaCallerMember = {
      id: callerMember.id,
      role: callerMember.role,
      userId: authSession.user.id,
    };

    return true;
  }
}
