import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '@/infra/database/prisma.service';
import { env } from '@/core/env/env';
import { runWithTenantContext } from '@/infra/tenant/tenant-context';

/**
 * Resolve o tenant (Organization) da requisição a partir do header Host, e
 * roda o restante do pipeline (guards, interceptors, handler) dentro do
 * AsyncLocalStorage de tenant-context.ts.
 *
 * Resolução, em ordem:
 *   1. Fora de produção (NODE_ENV=development ou test), o header
 *      "X-Tenant-Slug", se presente, tem prioridade — não há subdomínio real
 *      em localhost, e isso permite testar via curl/Postman/Insomnia sem
 *      configurar DNS local, além de ser o mecanismo que os specs e2e (ver
 *      test/*.e2e-spec.ts) usam pra simular tenants.
 *   2. customDomain exatamente igual ao host (ex: www.clinicaabc.com.br).
 *   3. Subdomínio do host usado como slug (ex: "clinicabemestar" em
 *      clinicabemestar.dominio-do-saas.com.br).
 *
 * Se nenhuma Organization for encontrada, responde 404.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organization = await this.resolveOrganization(req);

      if (!organization) {
        next(
          new NotFoundException(
            `Nenhuma organização encontrada para o domínio "${req.hostname}".`,
          ),
        );
        return;
      }

      runWithTenantContext({ organizationId: organization.id }, () => next());
    } catch (error) {
      next(error);
    }
  }

  private async resolveOrganization(req: Request) {
    const devSlugOverride = this.getDevSlugOverride(req);
    if (devSlugOverride) {
      return this.prisma.db.organization.findUnique({
        where: { slug: devSlugOverride },
      });
    }

    const host = this.getHostWithoutPort(req);
    if (!host) {
      return null;
    }

    const subdomain = this.extractSubdomain(host);

    return this.prisma.db.organization.findFirst({
      where: {
        OR: [
          { customDomain: host },
          ...(subdomain ? [{ slug: subdomain }] : []),
        ],
      },
    });
  }

  private getDevSlugOverride(req: Request): string | null {
    if (env.NODE_ENV === 'production') {
      return null;
    }
    const header = req.headers['x-tenant-slug'];
    if (!header) {
      return null;
    }
    return Array.isArray(header) ? header[0] : header;
  }

  private getHostWithoutPort(req: Request): string | null {
    const host = req.headers.host;
    if (!host) {
      return null;
    }
    return host.split(':')[0];
  }

  /** Extrai o primeiro label do host como possível slug (ex: "clinicabemestar" de "clinicabemestar.dominio-do-saas.com.br"). */
  private extractSubdomain(host: string): string | null {
    const parts = host.split('.');
    if (parts.length < 3) {
      // "localhost", "dominio-do-saas.com.br", IPs etc. — sem subdomínio.
      return null;
    }
    return parts[0];
  }
}
