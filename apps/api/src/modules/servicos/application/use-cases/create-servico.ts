import { Injectable } from '@nestjs/common';
import { Servico } from '../../enterprise/entities/servico';
import { ServicosRepository } from '../repositories/servicos-repository';

// organizationId placeholder: sempre sobrescrito em runtime pela Prisma
// Client Extension de tenant (ver prisma-tenant.extension.ts), que injeta o
// organizationId real em todo `create` de model tenant-scoped. A entidade
// aqui na camada de aplicação não sabe (nem precisa saber) qual é o tenant
// atual — só o repositório Prisma, na infra, lida com isso.
const ORGANIZATION_ID_PLACEHOLDER = '';

export interface CreateServicoUseCaseRequest {
  nome: string;
  duracaoMinutos: number;
  preco: number;
  ativo?: boolean;
}

export interface CreateServicoUseCaseResponse {
  servico: Servico;
}

@Injectable()
export class CreateServicoUseCase {
  constructor(private readonly servicosRepository: ServicosRepository) {}

  async execute(
    request: CreateServicoUseCaseRequest,
  ): Promise<CreateServicoUseCaseResponse> {
    const servico = Servico.create({
      organizationId: ORGANIZATION_ID_PLACEHOLDER,
      nome: request.nome,
      duracaoMinutos: request.duracaoMinutos,
      preco: request.preco,
      ativo: request.ativo ?? true,
    });

    const createdServico = await this.servicosRepository.create(servico);

    return { servico: createdServico };
  }
}
