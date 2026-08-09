import { Module } from '@nestjs/common';
import { ServicosRepository } from '@/modules/servicos/application/repositories/servicos-repository';
import { ActivateServicoUseCase } from '@/modules/servicos/application/use-cases/activate-servico';
import { CreateServicoUseCase } from '@/modules/servicos/application/use-cases/create-servico';
import { DeactivateServicoUseCase } from '@/modules/servicos/application/use-cases/deactivate-servico';
import { GetServicoUseCase } from '@/modules/servicos/application/use-cases/get-servico';
import { ListServicosUseCase } from '@/modules/servicos/application/use-cases/list-servicos';
import { UpdateServicoUseCase } from '@/modules/servicos/application/use-cases/update-servico';
import { PrismaServicosRepository } from '@/modules/servicos/infra/database/prisma-servicos-repository';
import { ActivateServicoController } from '@/modules/servicos/infra/http/controllers/activate-servico.controller';
import { CreateServicoController } from '@/modules/servicos/infra/http/controllers/create-servico.controller';
import { DeactivateServicoController } from '@/modules/servicos/infra/http/controllers/deactivate-servico.controller';
import { GetServicoController } from '@/modules/servicos/infra/http/controllers/get-servico.controller';
import { ListServicosController } from '@/modules/servicos/infra/http/controllers/list-servicos.controller';
import { UpdateServicoController } from '@/modules/servicos/infra/http/controllers/update-servico.controller';

@Module({
  controllers: [
    CreateServicoController,
    GetServicoController,
    ListServicosController,
    UpdateServicoController,
    ActivateServicoController,
    DeactivateServicoController,
  ],
  providers: [
    {
      provide: ServicosRepository,
      useClass: PrismaServicosRepository,
    },
    CreateServicoUseCase,
    GetServicoUseCase,
    ListServicosUseCase,
    UpdateServicoUseCase,
    ActivateServicoUseCase,
    DeactivateServicoUseCase,
  ],
})
export class ServicosModule {}
