import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import { ServicosRepository } from '@/modules/servicos/application/repositories/servicos-repository';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';

export interface UpdateServicoUseCaseRequest {
  servicoId: string;
  nome?: string;
  duracaoMinutos?: number;
  preco?: number;
}

export type UpdateServicoUseCaseResponse = Either<ServicoNotFoundError, null>;

@Injectable()
export class UpdateServicoUseCase {
  constructor(private readonly servicosRepository: ServicosRepository) {}

  async execute({
    servicoId,
    nome,
    duracaoMinutos,
    preco,
  }: UpdateServicoUseCaseRequest): Promise<UpdateServicoUseCaseResponse> {
    const servico = await this.servicosRepository.findById(servicoId);

    if (!servico) {
      return left(new ServicoNotFoundError());
    }

    servico.atualizarDados({
      nome: nome,
      duracaoMinutos: duracaoMinutos,
      preco: preco,
    });

    await this.servicosRepository.save(servico);

    return right(null);
  }
}
