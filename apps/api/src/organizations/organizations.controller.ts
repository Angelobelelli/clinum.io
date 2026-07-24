import { Body, Controller, Get, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../core/database/prisma.service';
import { getCurrentTenantId } from '../core/tenant/tenant-context';

interface CreateOrganizationBody {
  name: string;
  slug: string;
  customDomain?: string;
  vertical?: string;
  plano?: string;
}

/**
 * Rotas de teste manual da fundação de tenant/auth — sem validação de
 * negócio ainda (ver prompt original). POST /organizations cria a
 * Organization diretamente via Prisma (não passa pelo endpoint do
 * better-auth) só para termos como popular dados de teste rapidamente.
 */
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  create(@Body() body: CreateOrganizationBody) {
    return this.prisma.db.organization.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        name: body.name,
        slug: body.slug,
        customDomain: body.customDomain,
        vertical: body.vertical,
        plano: body.plano,
      },
    });
  }

  /**
   * Prova que TenantMiddleware + AsyncLocalStorage resolveram corretamente o
   * tenant a partir do Host (ou do header X-Tenant-Slug em dev).
   */
  @Get('me')
  me() {
    const organizationId = getCurrentTenantId();
    return this.prisma.db.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
  }
}
