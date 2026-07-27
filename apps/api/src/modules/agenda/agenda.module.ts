import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaPermissionGuard } from './agenda-permission.guard';
import { AgendaService } from './agenda.service';

@Module({
  controllers: [AgendaController],
  providers: [AgendaService, AgendaPermissionGuard],
})
export class AgendaModule {}
