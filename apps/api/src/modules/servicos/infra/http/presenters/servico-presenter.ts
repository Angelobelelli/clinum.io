import { Servico } from '@/modules/servicos/enterprise/entities/servico';

export class ServicoPresenter {
  static toHTTP(servico: Servico) {
    return {
      id: servico.id.toValue(),
      nome: servico.nome,
      duracaoMinutos: servico.duracaoMinutos,
      preco: servico.preco,
      ativo: servico.ativo,
      createdAt: servico.createdAt,
      updatedAt: servico.updatedAt,
    };
  }
}
