import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import {
  Servico,
  ServicoProps,
} from '@/modules/servicos/enterprise/entities/servico';

let sequence = 0;

export function makeServico(
  override: Partial<ServicoProps> = {},
  id?: UniqueEntityID,
): Servico {
  sequence += 1;

  return Servico.create(
    {
      organizationId: 'org-test',
      nome: `Serviço de teste ${sequence}`,
      duracaoMinutos: 30,
      preco: 100,
      ativo: true,
      ...override,
    },
    id,
  );
}
