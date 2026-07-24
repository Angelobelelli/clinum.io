import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth } from '../auth/auth';
import { getCurrentTenantId } from './tenant-context';

/**
 * Revalida, para toda requisição autenticada, que a organização ativa da
 * sessão do better-auth é a MESMA que o TenantMiddleware resolveu a partir
 * do domínio (Host) da requisição.
 *
 * Isso impede que uma sessão válida da org A seja usada para acessar dados
 * servidos sob o domínio/subdomínio da org B.
 *
 * Requisições sem sessão better-auth passam por este guard sem restrição —
 * ele não decide se uma rota exige login, apenas garante que, quando HÁ
 * sessão, ela bate com o tenant do domínio. A obrigatoriedade de login por
 * rota fica a cargo de um guard de autenticação futuro (ou @Public()).
 */
@Injectable()
export class TenantMatchGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const authSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!authSession) {
      return true;
    }

    // `activeOrganizationId` é adicionado ao model Session pelo plugin
    // Organization (ver schema.prisma) — não faz parte do tipo base do
    // better-auth, por isso o acesso via cast abaixo.
    const sessionOrganizationId = (
      authSession.session as unknown as { activeOrganizationId?: string }
    ).activeOrganizationId;

    if (!sessionOrganizationId) {
      return true;
    }

    const resolvedTenantId = getCurrentTenantId();

    if (sessionOrganizationId !== resolvedTenantId) {
      throw new ForbiddenException(
        'A organização da sua sessão não corresponde à organização deste domínio.',
      );
    }

    return true;
  }
}
