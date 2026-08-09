import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '@/infra/auth/auth';
import { isPlatformSuperAdmin } from '@/infra/auth/platform-role';
import type { PlatformAdminRequest } from '@/modules/platform-admin/platform-admin-request';

/**
 * Gate de acesso à administração da PLATAFORMA (dono do SaaS, cross-tenant)
 * — via plugin `admin` do better-auth. Independente de TenantMatchGuard:
 * rotas de plataforma não têm (e não devem ter) um tenant resolvido pelo
 * domínio, já que por definição atuam sobre múltiplas organizações. O
 * controller que usa este guard também precisa de @SkipTenantMatch() para
 * não ser barrado pelo TenantMatchGuard global (ver app.module.ts).
 *
 * TODO(segurança): antes de operar com clientes reais, exigir 2FA (plugin
 * `twoFactor` do better-auth) para qualquer sessão que acesse rotas de
 * platform-admin — hoje basta e-mail/senha + platformRole = "super_admin".
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<PlatformAdminRequest>();

    const authSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!authSession) {
      throw new UnauthorizedException('Autenticação necessária.');
    }

    if (!isPlatformSuperAdmin(authSession.user)) {
      throw new ForbiddenException(
        'Acesso restrito à administração da plataforma.',
      );
    }

    req.platformAdminSession = authSession;

    return true;
  }
}
