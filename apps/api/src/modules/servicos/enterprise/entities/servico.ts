import { Entity } from '../../../../core/entities/entity';
import { UniqueEntityID } from '../../../../core/entities/unique-entity-id';

export interface ServicoProps {
  organizationId: string;
  nome: string;
  duracaoMinutos: number;
  preco: number;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Servico extends Entity<ServicoProps> {
  get organizationId(): string {
    return this.props.organizationId;
  }

  get nome(): string {
    return this.props.nome;
  }

  set nome(value: string) {
    this.props.nome = value;
    this.touch();
  }

  get duracaoMinutos(): number {
    return this.props.duracaoMinutos;
  }

  set duracaoMinutos(value: number) {
    this.props.duracaoMinutos = value;
    this.touch();
  }

  get preco(): number {
    return this.props.preco;
  }

  set preco(value: number) {
    this.props.preco = value;
    this.touch();
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  set ativo(value: boolean) {
    this.props.ativo = value;
    this.touch();
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  static create(
    props: Omit<ServicoProps, 'createdAt' | 'updatedAt'> &
      Partial<Pick<ServicoProps, 'createdAt' | 'updatedAt'>>,
    id?: UniqueEntityID,
  ): Servico {
    const now = new Date();

    return new Servico(
      {
        ...props,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now,
      },
      id,
    );
  }
}
