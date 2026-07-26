import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth } from '../../core/auth/auth';
import { PrismaService } from '../../core/database/prisma.service';
import { getCurrentTenantId } from '../../core/tenant/tenant-context';

const ORG_ADMIN_ROLES = new Set(['owner', 'admin']);

/**
 * Gate de escrita em Member DENTRO da organização (não confundir com
 * PlatformAdminGuard, que é sobre acesso à PLATAFORMA/cross-tenant).
 *
 * Regras:
 *   1. Precisa de sessão better-auth válida (401).
 *   2. O Member alvo (:memberId) precisa pertencer ao tenant resolvido
 *      pelo domínio (TenantMiddleware já rodou antes deste guard) — se não
 *      pertencer, ou não existir, 404 (não 403/200), pra não vazar a
 *      existência de um member de outro tenant.
 *   3. Quem está chamando precisa ser owner/admin do MESMO tenant (403
 *      caso contrário) — inclui o caso de um staff tentando alterar o
 *      próprio vínculo/status.
 */
@Injectable()
export class MemberOrgAdminGuard implements CanActivate {
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
    const memberIdParam = req.params.memberId;
    const memberId = Array.isArray(memberIdParam)
      ? memberIdParam[0]
      : memberIdParam;

    const targetMember = await this.prisma.db.member.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== tenantId) {
      throw new NotFoundException('Member não encontrado.');
    }

    const callerMember = await this.prisma.db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tenantId,
          userId: authSession.user.id,
        },
      },
    });

    if (!callerMember || !ORG_ADMIN_ROLES.has(callerMember.role)) {
      throw new ForbiddenException(
        'Apenas owner/admin da organização podem alterar tipoVinculo/status de um member.',
      );
    }

    return true;
  }
}
