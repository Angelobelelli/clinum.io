import { makePatient } from '../../../../test/factories/make-patient';
import { makePatientHealthRecord } from '../../../../test/factories/make-patient-health-record';
import { InMemoryPatientHealthRecordsRepository } from '../../../../test/repositories/in-memory-patient-health-records-repository';
import { InMemoryPatientsRepository } from '../../../../test/repositories/in-memory-patients-repository';
import { HealthRecordNotFoundError } from './errors/health-record-not-found-error';
import { PatientNotFoundError } from './errors/patient-not-found-error';
import { GetHealthRecordUseCase } from './get-health-record';

describe('GetHealthRecordUseCase', () => {
  let patientsRepository: InMemoryPatientsRepository;
  let patientHealthRecordsRepository: InMemoryPatientHealthRecordsRepository;
  let sut: GetHealthRecordUseCase;

  beforeEach(() => {
    patientsRepository = new InMemoryPatientsRepository();
    patientHealthRecordsRepository =
      new InMemoryPatientHealthRecordsRepository();
    sut = new GetHealthRecordUseCase(
      patientsRepository,
      patientHealthRecordsRepository,
    );
  });

  it('retorna a ficha de saúde do paciente', async () => {
    const patient = await patientsRepository.create(makePatient());
    await patientHealthRecordsRepository.create(
      makePatientHealthRecord({
        patientId: patient.id.toValue(),
        alergias: 'Dipirona',
      }),
    );

    const result = await sut.execute({ patientId: patient.id.toValue() });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.healthRecord.alergias).toBe('Dipirona');
    }
  });

  it('retorna PatientNotFoundError quando o paciente não existe', async () => {
    const result = await sut.execute({ patientId: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(PatientNotFoundError);
    }
  });

  it('retorna HealthRecordNotFoundError quando o paciente existe mas não tem ficha', async () => {
    const patient = await patientsRepository.create(makePatient());

    const result = await sut.execute({ patientId: patient.id.toValue() });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(HealthRecordNotFoundError);
    }
  });
});
