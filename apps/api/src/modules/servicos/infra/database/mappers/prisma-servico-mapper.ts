import type {
  Prisma,
  Servico as PrismaServico,
} from '../../../../../../generated/prisma/client';
import { UniqueEntityID } from '../../../../../core/entities/unique-entity-id';
import { Servico } from '../../../enterprise/entities/servico';

export class PrismaServicoMapper {
  static toDomain(raw: PrismaServico): Servico {
    return Servico.create(
      {
        organizationId: raw.organizationId,
        nome: raw.nome,
        duracaoMinutos: raw.duracaoMinutos,
        preco: raw.preco,
        ativo: raw.ativo,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  /**
   * organizationId incluído aqui só para satisfazer o tipo gerado pelo
   * Prisma — em `create`, a Prisma Client Extension de tenant sobrescreve
   * esse valor com o organizationId real do contexto (ver
   * prisma-tenant.extension.ts), então o que a entidade carrega neste ponto
   * é irrelevante para o resultado final.
   */
  static toPrismaCreate(servico: Servico): Prisma.ServicoUncheckedCreateInput {
    return {
      organizationId: servico.organizationId,
      nome: servico.nome,
      duracaoMinutos: servico.duracaoMinutos,
      preco: servico.preco,
      ativo: servico.ativo,
    };
  }

  static toPrismaUpdate(servico: Servico): Prisma.ServicoUpdateInput {
    return {
      nome: servico.nome,
      duracaoMinutos: servico.duracaoMinutos,
      preco: servico.preco,
      ativo: servico.ativo,
    };
  }
}
