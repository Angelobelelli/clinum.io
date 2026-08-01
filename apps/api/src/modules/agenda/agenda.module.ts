import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { AgendamentoAuditLogsRepository } from './application/repositories/agendamento-audit-logs-repository';
import { AgendamentosRepository } from './application/repositories/agendamentos-repository';
import { ProfissionaisRepository } from './application/repositories/profissionais-repository';
import { CancelAgendamentoUseCase } from './application/use-cases/cancel-agendamento';
import { CreateAgendamentoUseCase } from './application/use-cases/create-agendamento';
import { ListAgendamentosUseCase } from './application/use-cases/list-agendamentos';
import { RevertAgendamentoUseCase } from './application/use-cases/revert-agendamento';
import { UpdateAgendamentoStatusUseCase } from './application/use-cases/update-agendamento-status';
import { UpdateAgendamentoUseCase } from './application/use-cases/update-agendamento';
import { PrismaAgendamentoAuditLogsRepository } from './infra/database/prisma-agendamento-audit-logs-repository';
import { PrismaAgendamentosRepository } from './infra/database/prisma-agendamentos-repository';
import { PrismaProfissionaisRepository } from './infra/database/prisma-profissionais-repository';
import { CancelAgendamentoController } from './infra/http/controllers/cancel-agendamento.controller';
import { CreateAgendamentoController } from './infra/http/controllers/create-agendamento.controller';
import { ListAgendamentosController } from './infra/http/controllers/list-agendamentos.controller';
import { RevertAgendamentoController } from './infra/http/controllers/revert-agendamento.controller';
import { UpdateAgendamentoStatusController } from './infra/http/controllers/update-agendamento-status.controller';
import { UpdateAgendamentoController } from './infra/http/controllers/update-agendamento.controller';

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
