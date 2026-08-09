import { left, right, type Either } from '@/core/either';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';
import { ServicosRepository } from '@/modules/servicos/application/repositories/servicos-repository';
import { Injectable } from '@nestjs/common';

export interface ActivateServicoUseCaseRequest {
  servicoId: string;
}

export type ActivateServicoUseCaseResponse = Either<ServicoNotFoundError, null>;

@Injectable()
export class ActivateServicoUseCase {
  constructor(private readonly servicosRepository: ServicosRepository) {}

  async execute({
    servicoId,
  }: ActivateServicoUseCaseRequest): Promise<ActivateServicoUseCaseResponse> {
    const servico = await this.servicosRepository.findById(servicoId);

    if (!servico) {
      return left(new ServicoNotFoundError());
    }

    servico.ativar();

    await this.servicosRepository.save(servico);

    return right(null);
  }
}
