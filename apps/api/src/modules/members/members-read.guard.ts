import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth } from '@/infra/auth/auth';
import { PrismaService } from '@/infra/database/prisma.service';
import { getCurrentTenantId } from '@/infra/tenant/tenant-context';

/**
 * Gate de LEITURA em Member — mais permissivo que MemberOrgAdminGuard
 * (exclusivo de owner/admin, usado só na escrita de tipoVinculo/status).
 * Listar os colegas da própria organização (Member.id, role, etc.) não é
 * uma operação sensível: qualquer papel precisa disso na prática, por
 * exemplo pra escolher o profissionalId certo ao criar um agendamento
 * (ver modules/agenda/). Só exige sessão válida + ser member do tenant
 * atual — sem checagem de role.
 */
@Injectable()
export class MembersReadGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

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

    return true;
  }
}
