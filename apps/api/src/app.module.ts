import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './core/database/database.module';
import { TenantMatchGuard } from './core/tenant/tenant-match.guard';
import { TenantMiddleware } from './core/tenant/tenant.middleware';
import { OrganizationsModule } from './organizations/organizations.module';

@Module({
  imports: [DatabaseModule, OrganizationsModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: TenantMatchGuard,
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
      )
      .forRoutes('*');
  }
}
