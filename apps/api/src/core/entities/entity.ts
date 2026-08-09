import { UniqueEntityID } from '@/core/entities/unique-entity-id';

/**
 * Classe base para entidades de domínio (enterprise/entities/*) — nunca
 * importada por infra/Prisma diretamente, só usada dentro de camadas
 * enterprise/application de cada módulo.
 */
export abstract class Entity<Props> {
  private readonly _id: UniqueEntityID;
  protected props: Props;

  protected constructor(props: Props, id?: UniqueEntityID) {
    this.props = props;
    this._id = id ?? new UniqueEntityID();
  }

  get id(): UniqueEntityID {
    return this._id;
  }

  equals(entity: Entity<unknown>): boolean {
    if (entity === this) {
      return true;
    }

    return entity.id.equals(this._id);
  }
}
