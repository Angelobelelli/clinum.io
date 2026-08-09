import { Injectable } from '@nestjs/common';
import { Servico } from '@/modules/servicos/enterprise/entities/servico';
import { ServicosRepository } from '@/modules/servicos/application/repositories/servicos-repository';

export interface CreateServicoUseCaseRequest {
  organizationId: string;
  nome: string;
  duracaoMinutos: number;
  preco: number;
}

export interface CreateServicoUseCaseResponse {
  servico: Servico;
}

@Injectable()
export class CreateServicoUseCase {
  constructor(private readonly servicosRepository: ServicosRepository) {}

  async execute({
    organizationId,
    nome,
    duracaoMinutos,
    preco,
  }: CreateServicoUseCaseRequest): Promise<CreateServicoUseCaseResponse> {
    const servico = Servico.create({
      organizationId,
      nome,
      duracaoMinutos,
      preco,
      ativo: true,
    });

    await this.servicosRepository.create(servico);

    return { servico };
  }
}
