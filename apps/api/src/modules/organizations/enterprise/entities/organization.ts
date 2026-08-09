import { Entity } from '@/core/entities/entity';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';

export interface OrganizationProps {
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: string | null;
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

  get logo(): string | null | undefined {
    return this.props.logo;
  }

  get metadata(): string | null | undefined {
    return this.props.metadata;
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

  static create(
    props: Omit<OrganizationProps, 'createdAt'> &
      Partial<Pick<OrganizationProps, 'createdAt'>>,
    id?: UniqueEntityID,
  ): Organization {
    return new Organization(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
  }
}
