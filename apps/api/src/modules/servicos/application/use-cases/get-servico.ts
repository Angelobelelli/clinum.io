import { left, right, type Either } from '@/core/either';
import { Servico } from '@/modules/servicos/enterprise/entities/servico';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';
import { ServicosRepository } from '@/modules/servicos/application/repositories/servicos-repository';
import { Injectable } from '@nestjs/common';

export interface GetServicoUseCaseRequest {
  servicoId: string;
}

export type GetServicoUseCaseResponse = Either<
  ServicoNotFoundError,
  { servico: Servico }
>;

@Injectable()
export class GetServicoUseCase {
  constructor(private readonly servicosRepository: ServicosRepository) {}

  async execute({
    servicoId,
  }: GetServicoUseCaseRequest): Promise<GetServicoUseCaseResponse> {
    const servico = await this.servicosRepository.findById(servicoId);

    if (!servico) {
      return left(new ServicoNotFoundError());
    }
    return right({ servico });
  }
}
