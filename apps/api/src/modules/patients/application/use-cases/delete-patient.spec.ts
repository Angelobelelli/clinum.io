import { makePatient } from '@/test/factories/make-patient';
import { InMemoryPatientsRepository } from '@/test/repositories/in-memory-patients-repository';
import { DeletePatientUseCase } from '@/modules/patients/application/use-cases/delete-patient';
import { PatientNotFoundError } from '@/modules/patients/application/use-cases/errors/patient-not-found-error';

describe('DeletePatientUseCase', () => {
  let patientsRepository: InMemoryPatientsRepository;
  let sut: DeletePatientUseCase;

  beforeEach(() => {
    patientsRepository = new InMemoryPatientsRepository();
    sut = new DeletePatientUseCase(patientsRepository);
  });

  it('remove o paciente do repositório', async () => {
    const patient = await patientsRepository.create(makePatient());

    const result = await sut.execute({ patientId: patient.id.toValue() });

    expect(result.isRight()).toBe(true);
    expect(patientsRepository.items).toHaveLength(0);
  });

  it('retorna PatientNotFoundError quando o paciente não existe', async () => {
    const result = await sut.execute({ patientId: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(PatientNotFoundError);
    }
  });
});
