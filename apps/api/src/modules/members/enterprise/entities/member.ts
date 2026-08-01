import { Entity } from '../../../../core/entities/entity';
import { UniqueEntityID } from '../../../../core/entities/unique-entity-id';

export type MemberTipoVinculoValue = 'funcionario' | 'parceiro_comissionado';
export type MemberStatusValue = 'ativo' | 'inativo';

export interface MemberProps {
  organizationId: string;
  userId: string;
  // role é escrito só pelo better-auth (ver access-control.ts) — exposto
  // aqui só leitura, nunca mutado por este módulo.
  role: string;
  tipoVinculo?: MemberTipoVinculoValue | null;
  status: MemberStatusValue;
  createdAt: Date;
}

export class Member extends Entity<MemberProps> {
  get organizationId(): string {
    return this.props.organizationId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get role(): string {
    return this.props.role;
  }

  get tipoVinculo(): MemberTipoVinculoValue | null | undefined {
    return this.props.tipoVinculo;
  }

  set tipoVinculo(value: MemberTipoVinculoValue | null | undefined) {
    this.props.tipoVinculo = value;
  }

  get status(): MemberStatusValue {
    return this.props.status;
  }

  set status(value: MemberStatusValue) {
    this.props.status = value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  static create(props: MemberProps, id?: UniqueEntityID): Member {
    return new Member(props, id);
  }
}
