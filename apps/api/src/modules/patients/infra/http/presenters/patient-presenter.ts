import { Patient } from '../../../enterprise/entities/patient';

/**
 * Achata a entidade de volta pro mesmo formato de linha que o Prisma
 * retornava antes desta refatoração (patients.service.ts cru) — pra não
 * quebrar nenhum consumidor (frontend, testes) que dependa do shape da
 * resposta.
 */
export class PatientPresenter {
  static toHTTP(patient: Patient) {
    return {
      id: patient.id.toValue(),
      organizationId: patient.organizationId,
      nome: patient.nome,
      cpf: patient.cpf,
      telefone: patient.telefone,
      email: patient.email,
      dataNascimento: patient.dataNascimento,
      dadosVerticais: patient.dadosVerticais,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }
  static toListItem(patient: Patient) {
    return {
      id: patient.id.toValue(),
      nome: patient.nome,
      telefone: patient.telefone,
    };
  }
}
