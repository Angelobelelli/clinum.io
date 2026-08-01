import { Entity } from '../../../../core/entities/entity';
import { UniqueEntityID } from '../../../../core/entities/unique-entity-id';

export interface PatientHealthRecordProps {
  organizationId: string;
  patientId: string;
  alergias?: string | null;
  historico?: string | null;
  observacoesClinicas?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PatientHealthRecord extends Entity<PatientHealthRecordProps> {
  get organizationId(): string {
    return this.props.organizationId;
  }

  get patientId(): string {
    return this.props.patientId;
  }

  get alergias(): string | null | undefined {
    return this.props.alergias;
  }

  set alergias(value: string | null | undefined) {
    this.props.alergias = value;
    this.touch();
  }

  get historico(): string | null | undefined {
    return this.props.historico;
  }

  set historico(value: string | null | undefined) {
    this.props.historico = value;
    this.touch();
  }

  get observacoesClinicas(): string | null | undefined {
    return this.props.observacoesClinicas;
  }

  set observacoesClinicas(value: string | null | undefined) {
    this.props.observacoesClinicas = value;
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
    props: Omit<PatientHealthRecordProps, 'createdAt' | 'updatedAt'> &
      Partial<Pick<PatientHealthRecordProps, 'createdAt' | 'updatedAt'>>,
    id?: UniqueEntityID,
  ): PatientHealthRecord {
    const now = new Date();

    return new PatientHealthRecord(
      {
        ...props,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now,
      },
      id,
    );
  }
}
