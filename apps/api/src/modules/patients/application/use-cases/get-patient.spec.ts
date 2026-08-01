import { makePatient } from '../../../../test/factories/make-patient';
import { InMemoryPatientsRepository } from '../../../../test/repositories/in-memory-patients-repository';
import { PatientNotFoundError } from './errors/patient-not-found-error';
import { GetPatientUseCase } from './get-patient';

describe('GetPatientUseCase', () => {
  let patientsRepository: InMemoryPatientsRepository;
  let sut: GetPatientUseCase;

  beforeEach(() => {
    patientsRepository = new InMemoryPatientsRepository();
    sut = new GetPatientUseCase(patientsRepository);
  });

  it('retorna o paciente quando encontrado', async () => {
    const patient = await patientsRepository.create(makePatient());

    const result = await sut.execute({ patientId: patient.id.toValue() });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.patient.id.toValue()).toBe(patient.id.toValue());
    }
  });

  it('retorna PatientNotFoundError quando o paciente não existe', async () => {
    const result = await sut.execute({ patientId: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(PatientNotFoundError);
    }
  });
});
