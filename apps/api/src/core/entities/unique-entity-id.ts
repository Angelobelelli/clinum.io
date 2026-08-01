import { randomUUID } from 'node:crypto';

/**
 * Wrapper de ID de entidade. Para entidades carregadas do banco (mapper
 * `toDomain`), sempre recebe o ID real já gerado pelo Postgres (cuid). Só
 * gera um novo UUID quando nenhum ID é passado — usado apenas como
 * identidade transitória de uma entidade ainda não persistida (o repositório
 * Prisma nunca envia esse valor gerado aqui como o ID definitivo; quem
 * decide o ID definitivo de uma linha nova é o `@default(cuid())` do
 * schema, ver prisma-patients-repository.ts).
 */
export class UniqueEntityID {
  private readonly value: string;

  constructor(value?: string) {
    this.value = value ?? randomUUID();
  }

  toString(): string {
    return this.value;
  }

  toValue(): string {
    return this.value;
  }

  equals(id: UniqueEntityID): boolean {
    return id.toValue() === this.value;
  }
}
