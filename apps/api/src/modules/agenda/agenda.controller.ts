import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../core/validation/zod-validation.pipe';
import { AgendaPermissionGuard } from './agenda-permission.guard';
import { RequireAgendaPermission } from './agenda-permission.decorator';
import type { AgendaPermissionRequest } from './agenda-permission-request';
import { AgendaService } from './agenda.service';
import { createAgendamentoSchema } from './dto/create-agendamento.schema';
import type { CreateAgendamentoInput } from './dto/create-agendamento.schema';
import { reverterAgendamentoSchema } from './dto/reverter-agendamento.schema';
import type { ReverterAgendamentoInput } from './dto/reverter-agendamento.schema';
import { updateAgendamentoStatusSchema } from './dto/update-agendamento-status.schema';
import type { UpdateAgendamentoStatusInput } from './dto/update-agendamento-status.schema';
import { updateAgendamentoSchema } from './dto/update-agendamento.schema';
import type { UpdateAgendamentoInput } from './dto/update-agendamento.schema';

/**
 * Rotas tenant-scoped normais (TenantMiddleware/TenantMatchGuard, sem
 * @SkipTenantMatch — ver PatientsController). O agendaCallerMember anexado
 * por AgendaPermissionGuard é repassado ao service, que aplica a
 * restrição de "próprio recurso" de staff (ver access-control.ts).
 */
@Controller('agendamentos')
@UseGuards(AgendaPermissionGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Post()
  @RequireAgendaPermission('create')
  create(
    @Req() req: AgendaPermissionRequest,
    @Body(new ZodValidationPipe(createAgendamentoSchema))
    dto: CreateAgendamentoInput,
  ) {
    return this.agendaService.create(dto, req.agendaCallerMember!);
  }

  @Get()
  @RequireAgendaPermission('read')
  findMany(
    @Req() req: AgendaPermissionRequest,
    @Query('data') data?: string,
    @Query('profissionalId') profissionalId?: string,
  ) {
    return this.agendaService.findMany(req.agendaCallerMember!, {
      data,
      profissionalId,
    });
  }

  @Patch(':id')
  @RequireAgendaPermission('update')
  update(
    @Req() req: AgendaPermissionRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgendamentoSchema))
    dto: UpdateAgendamentoInput,
  ) {
    return this.agendaService.update(id, dto, req.agendaCallerMember!);
  }

  @Patch(':id/cancelar')
  @RequireAgendaPermission('cancel')
  cancelar(@Req() req: AgendaPermissionRequest, @Param('id') id: string) {
    return this.agendaService.cancelar(id, req.agendaCallerMember!);
  }

  @Patch(':id/status')
  @RequireAgendaPermission('update_status')
  updateStatus(
    @Req() req: AgendaPermissionRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgendamentoStatusSchema))
    dto: UpdateAgendamentoStatusInput,
  ) {
    return this.agendaService.updateStatus(id, dto, req.agendaCallerMember!);
  }

  @Patch(':id/reverter')
  @RequireAgendaPermission('revert')
  reverter(
    @Req() req: AgendaPermissionRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reverterAgendamentoSchema))
    dto: ReverterAgendamentoInput,
  ) {
    return this.agendaService.reverter(id, dto, req.agendaCallerMember!);
  }
}
