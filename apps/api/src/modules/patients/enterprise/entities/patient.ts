import { Entity } from '@/core/entities/entity';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';

export interface PatientProps {
  organizationId: string;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  dataNascimento?: Date | null;
  dadosVerticais?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Patient extends Entity<PatientProps> {
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

  get cpf(): string | null | undefined {
    return this.props.cpf;
  }

  set cpf(value: string | null | undefined) {
    this.props.cpf = value;
    this.touch();
  }

  get telefone(): string | null | undefined {
    return this.props.telefone;
  }

  set telefone(value: string | null | undefined) {
    this.props.telefone = value;
    this.touch();
  }

  get email(): string | null | undefined {
    return this.props.email;
  }

  set email(value: string | null | undefined) {
    this.props.email = value;
    this.touch();
  }

  get dataNascimento(): Date | null | undefined {
    return this.props.dataNascimento;
  }

  set dataNascimento(value: Date | null | undefined) {
    this.props.dataNascimento = value;
    this.touch();
  }

  get dadosVerticais(): Record<string, unknown> | null | undefined {
    return this.props.dadosVerticais;
  }

  set dadosVerticais(value: Record<string, unknown> | null | undefined) {
    this.props.dadosVerticais = value;
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
    props: Omit<PatientProps, 'createdAt' | 'updatedAt'> &
      Partial<Pick<PatientProps, 'createdAt' | 'updatedAt'>>,
    id?: UniqueEntityID,
  ): Patient {
    const now = new Date();

    return new Patient(
      {
        ...props,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now,
      },
      id,
    );
  }
}
