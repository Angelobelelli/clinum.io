import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import {
  Patient,
  PatientProps,
} from '@/modules/patients/enterprise/entities/patient';

let sequence = 0;

export function makePatient(
  override: Partial<PatientProps> = {},
  id?: UniqueEntityID,
): Patient {
  sequence += 1;

  return Patient.create(
    {
      organizationId: 'org-test',
      nome: `Paciente de teste ${sequence}`,
      cpf: null,
      telefone: null,
      email: null,
      dataNascimento: null,
      dadosVerticais: null,
      ...override,
    },
    id,
  );
}
