import { Module } from '@nestjs/common';
import { PatientsModule } from '@/modules/patients/patients.module';
import { AgendamentoAuditLogsRepository } from '@/modules/agenda/application/repositories/agendamento-audit-logs-repository';
import { AgendamentosRepository } from '@/modules/agenda/application/repositories/agendamentos-repository';
import { ProfissionaisRepository } from '@/modules/agenda/application/repositories/profissionais-repository';
import { CancelAgendamentoUseCase } from '@/modules/agenda/application/use-cases/cancel-agendamento';
import { CreateAgendamentoUseCase } from '@/modules/agenda/application/use-cases/create-agendamento';
import { ListAgendamentosUseCase } from '@/modules/agenda/application/use-cases/list-agendamentos';
import { RevertAgendamentoUseCase } from '@/modules/agenda/application/use-cases/revert-agendamento';
import { UpdateAgendamentoStatusUseCase } from '@/modules/agenda/application/use-cases/update-agendamento-status';
import { UpdateAgendamentoUseCase } from '@/modules/agenda/application/use-cases/update-agendamento';
import { PrismaAgendamentoAuditLogsRepository } from '@/modules/agenda/infra/database/prisma-agendamento-audit-logs-repository';
import { PrismaAgendamentosRepository } from '@/modules/agenda/infra/database/prisma-agendamentos-repository';
import { PrismaProfissionaisRepository } from '@/modules/agenda/infra/database/prisma-profissionais-repository';
import { CancelAgendamentoController } from '@/modules/agenda/infra/http/controllers/cancel-agendamento.controller';
import { CreateAgendamentoController } from '@/modules/agenda/infra/http/controllers/create-agendamento.controller';
import { ListAgendamentosController } from '@/modules/agenda/infra/http/controllers/list-agendamentos.controller';
import { RevertAgendamentoController } from '@/modules/agenda/infra/http/controllers/revert-agendamento.controller';
import { UpdateAgendamentoStatusController } from '@/modules/agenda/infra/http/controllers/update-agendamento-status.controller';
import { UpdateAgendamentoController } from '@/modules/agenda/infra/http/controllers/update-agendamento.controller';

@Module({
  imports: [PatientsModule],
  controllers: [
    CreateAgendamentoController,
    ListAgendamentosController,
    UpdateAgendamentoController,
    CancelAgendamentoController,
    UpdateAgendamentoStatusController,
    RevertAgendamentoController,
  ],
  providers: [
    { provide: AgendamentosRepository, useClass: PrismaAgendamentosRepository },
    {
      provide: AgendamentoAuditLogsRepository,
      useClass: PrismaAgendamentoAuditLogsRepository,
    },
    {
      provide: ProfissionaisRepository,
      useClass: PrismaProfissionaisRepository,
    },
    CreateAgendamentoUseCase,
    ListAgendamentosUseCase,
    UpdateAgendamentoUseCase,
    CancelAgendamentoUseCase,
    UpdateAgendamentoStatusUseCase,
    RevertAgendamentoUseCase,
  ],
})
export class AgendaModule {}
