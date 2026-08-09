import { Entity } from '@/core/entities/entity';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';

/**
 * Visão de Organization própria do platform-admin — só leitura (este módulo
 * nunca cria/edita Organization, isso é feito pelo bootstrap em
 * src/organizations/ e pelo plugin organization do better-auth). Por isso
 * não tem setters nem métodos de negócio, diferente das outras entidades
 * do projeto.
 */
export interface OrganizationProps {
  name: string;
  slug: string;
  customDomain?: string | null;
  vertical?: string | null;
  plano?: string | null;
  createdAt: Date;
}

export class Organization extends Entity<OrganizationProps> {
  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get customDomain(): string | null | undefined {
    return this.props.customDomain;
  }

  get vertical(): string | null | undefined {
    return this.props.vertical;
  }

  get plano(): string | null | undefined {
    return this.props.plano;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  static create(props: OrganizationProps, id?: UniqueEntityID): Organization {
    return new Organization(props, id);
  }
}
