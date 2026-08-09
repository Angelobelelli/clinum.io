import { Entity } from '@/core/entities/entity';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';

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

  get duracaoMinutos(): number {
    return this.props.duracaoMinutos;
  }

  get preco(): number {
    return this.props.preco;
  }

  get ativo(): boolean {
    return this.props.ativo;
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

  atualizarDados(dados: {
    nome?: string;
    duracaoMinutos?: number;
    preco?: number;
  }): void {
    if (dados.duracaoMinutos !== undefined && dados.duracaoMinutos < 1) {
      throw new Error('Duração deve ser no mínimo 1 minuto');
    }
    if (dados.preco !== undefined && dados.preco < 0) {
      throw new Error('Preço não pode ser negativo');
    }
    if (dados.nome !== undefined) this.props.nome = dados.nome;
    if (dados.duracaoMinutos !== undefined)
      this.props.duracaoMinutos = dados.duracaoMinutos;
    if (dados.preco !== undefined) this.props.preco = dados.preco;
    this.touch();
  }

  ativar(): void {
    this.props.ativo = true;
    this.touch();
  }

  desativar(): void {
    this.props.ativo = false;
    this.touch();
  }
}
