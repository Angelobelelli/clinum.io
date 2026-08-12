import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { DatabaseModule } from '@/infra/database/database.module';
import { PermissionGuard } from '@/infra/auth/permission.guard';
import { PrismaExceptionFilter } from '@/infra/error-handling/prisma-exception.filter';
import { QueueModule } from '@/infra/queue/queue.module';
import { TenantMatchGuard } from '@/infra/tenant/tenant-match.guard';
import { TenantMiddleware } from '@/infra/tenant/tenant.middleware';
import { OrganizationsModule } from '@/modules/organizations/organizations.module';
import { PlatformAdminModule } from '@/modules/platform-admin/platform-admin.module';
import { MembersModule } from '@/modules/members/members.module';
import { PatientsModule } from '@/modules/patients/patients.module';
import { AgendaModule } from '@/modules/agenda/agenda.module';
import { ServicosModule } from '@/modules/servicos/servicos.module';
import { GoogleCalendarModule } from '@/modules/google-calendar/google-calendar.module';
import { AgendaGoogleCalendarBindingModule } from '@/modules/google-calendar/infra/agenda-bridge/agenda-google-calendar-binding.module';

@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    OrganizationsModule,
    PlatformAdminModule,
    MembersModule,
    PatientsModule,
    AgendaModule,
    ServicosModule,
    GoogleCalendarModule,
    AgendaGoogleCalendarBindingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: TenantMatchGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        // Health-check / rota raiz — não é específica de nenhum tenant.
        { path: '/', method: RequestMethod.GET },
        // Criar uma organização é uma operação de "pré-tenant" — não existe
        // ainda um domínio/subdomínio resolvível para ela.
        { path: 'organizations', method: RequestMethod.POST },
        // Rotas de administração da PLATAFORMA (dono do SaaS) são
        // cross-tenant por definição — não faz sentido resolver um tenant
        // pelo domínio para elas (ver modules/platform-admin/). O
        // isolamento aqui é responsabilidade de PlatformAdminGuard, não de
        // TenantMiddleware/TenantMatchGuard (ver @SkipTenantMatch no
        // controller).
        { path: 'platform-admin/{*splat}', method: RequestMethod.ALL },
        // Callback OAuth e webhook do Google Calendar: o Google não conhece
        // subdomínio/domínio de tenant nem manda sessão better-auth — o
        // organizationId vem do `state` assinado (callback) ou é resolvido
        // via watchChannelId (webhook), ver
        // modules/google-calendar/infra/http/controllers/.
        {
          path: 'google-calendar/oauth/callback',
          method: RequestMethod.GET,
        },
        { path: 'google-calendar/webhook', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
