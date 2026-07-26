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
  PATIENT_PERMISSION_KEY,
  type PatientAction,
} from './patient-permission.decorator';
import type { PatientPermissionRequest } from './patient-permission-request';

/**
 * Gate de permissão para o resource "patient" (ver access-control.ts).
 * Só decide AUTORIZAÇÃO por papel (owner/admin/staff/reception) — não sabe
 * nada sobre um :patientId específico. O 404 pra paciente de outro tenant
 * acontece naturalmente no PatientsService, porque ele usa
 * TenantScopedPrismaService (que já filtra por organizationId
 * automaticamente via a extension) — uma busca que não encontra nada
 * (inexistente OU de outro tenant) já vira NotFoundException lá, sem o
 * guard precisar se preocupar com isso.
 */
@Injectable()
export class PatientPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<PatientPermissionRequest>();

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

    const action = this.reflector.getAllAndOverride<PatientAction | undefined>(
      PATIENT_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const role = roleByName[callerMember.role as keyof typeof roleByName] as
      | {
          authorize: (request: { patient: PatientAction[] }) => {
            success: boolean;
          };
        }
      | undefined;

    const authorized = action
      ? role?.authorize({ patient: [action] })
      : undefined;

    if (!authorized?.success) {
      throw new ForbiddenException(
        'Você não tem permissão para essa ação sobre pacientes.',
      );
    }

    req.patientCallerMember = { id: callerMember.id, role: callerMember.role };

    return true;
  }
}
