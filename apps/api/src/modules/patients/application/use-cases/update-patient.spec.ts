import { makePatient } from '@/test/factories/make-patient';
import { InMemoryPatientsRepository } from '@/test/repositories/in-memory-patients-repository';
import { PatientNotFoundError } from '@/modules/patients/application/use-cases/errors/patient-not-found-error';
import { UpdatePatientUseCase } from '@/modules/patients/application/use-cases/update-patient';

describe('UpdatePatientUseCase', () => {
  let patientsRepository: InMemoryPatientsRepository;
  let sut: UpdatePatientUseCase;

  beforeEach(() => {
    patientsRepository = new InMemoryPatientsRepository();
    sut = new UpdatePatientUseCase(patientsRepository);
  });

  it('atualiza os campos informados do paciente', async () => {
    const patient = await patientsRepository.create(
      makePatient({ nome: 'Nome Antigo' }),
    );

    const result = await sut.execute({
      patientId: patient.id.toValue(),
      nome: 'Nome Novo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.patient.nome).toBe('Nome Novo');
    }
  });

  it('retorna PatientNotFoundError quando o paciente não existe', async () => {
    const result = await sut.execute({
      patientId: 'inexistente',
      nome: 'Nome Novo',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(PatientNotFoundError);
    }
  });
});
