import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '@/core/either';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';
import { ServicosRepository } from '@/modules/servicos/application/repositories/servicos-repository';

export interface DeactivateServicoUseCaseRequest {
  servicoId: string;
}

export type DeactivateServicoUseCaseResponse = Either<
  ServicoNotFoundError,
  null
>;

@Injectable()
export class DeactivateServicoUseCase {
  constructor(private readonly servicosRepository: ServicosRepository) {}

  async execute({
    servicoId,
  }: DeactivateServicoUseCaseRequest): Promise<DeactivateServicoUseCaseResponse> {
    const servico = await this.servicosRepository.findById(servicoId);

    if (!servico) {
      return left(new ServicoNotFoundError());
    }

    servico.desativar();

    await this.servicosRepository.save(servico);

    return right(null);
  }
}
