import { Injectable } from '@nestjs/common';
import { Either, left, right } from '../../../../core/either';
import { Servico } from '../../enterprise/entities/servico';
import { ServicosRepository } from '../repositories/servicos-repository';
import { ServicoNotFoundError } from './errors/servico-not-found-error';

export interface UpdateServicoUseCaseRequest {
  servicoId: string;
  nome?: string;
  duracaoMinutos?: number;
  preco?: number;
  ativo?: boolean;
}

export type UpdateServicoUseCaseResponse = Either<
  ServicoNotFoundError,
  { servico: Servico }
>;

@Injectable()
export class UpdateServicoUseCase {
  constructor(private readonly servicosRepository: ServicosRepository) {}

  async execute(
    request: UpdateServicoUseCaseRequest,
  ): Promise<UpdateServicoUseCaseResponse> {
    const servico = await this.servicosRepository.findById(request.servicoId);

    if (!servico) {
      return left(new ServicoNotFoundError());
    }

    if (request.nome !== undefined) servico.nome = request.nome;
    if (request.duracaoMinutos !== undefined)
      servico.duracaoMinutos = request.duracaoMinutos;
    if (request.preco !== undefined) servico.preco = request.preco;
    if (request.ativo !== undefined) servico.ativo = request.ativo;

    const updatedServico = await this.servicosRepository.save(servico);

    return right({ servico: updatedServico });
  }
}
