import { makePatient } from '@/test/factories/make-patient';
import { makePatientHealthRecord } from '@/test/factories/make-patient-health-record';
import { InMemoryPatientHealthRecordsRepository } from '@/test/repositories/in-memory-patient-health-records-repository';
import { InMemoryPatientsRepository } from '@/test/repositories/in-memory-patients-repository';
import { HealthRecordNotFoundError } from '@/modules/patients/application/use-cases/errors/health-record-not-found-error';
import { PatientNotFoundError } from '@/modules/patients/application/use-cases/errors/patient-not-found-error';
import { UpdateHealthRecordUseCase } from '@/modules/patients/application/use-cases/update-health-record';

describe('UpdateHealthRecordUseCase', () => {
  let patientsRepository: InMemoryPatientsRepository;
  let patientHealthRecordsRepository: InMemoryPatientHealthRecordsRepository;
  let sut: UpdateHealthRecordUseCase;

  beforeEach(() => {
    patientsRepository = new InMemoryPatientsRepository();
    patientHealthRecordsRepository =
      new InMemoryPatientHealthRecordsRepository();
    sut = new UpdateHealthRecordUseCase(
      patientsRepository,
      patientHealthRecordsRepository,
    );
  });

  it('atualiza os campos informados da ficha de saúde', async () => {
    const patient = await patientsRepository.create(makePatient());
    await patientHealthRecordsRepository.create(
      makePatientHealthRecord({ patientId: patient.id.toValue() }),
    );

    const result = await sut.execute({
      patientId: patient.id.toValue(),
      alergias: 'Dipirona',
      historico: 'Nenhum relevante',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.healthRecord.alergias).toBe('Dipirona');
      expect(result.value.healthRecord.historico).toBe('Nenhum relevante');
    }
  });

  it('retorna PatientNotFoundError quando o paciente não existe', async () => {
    const result = await sut.execute({
      patientId: 'inexistente',
      alergias: 'Dipirona',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(PatientNotFoundError);
    }
  });

  it('retorna HealthRecordNotFoundError quando o paciente existe mas não tem ficha', async () => {
    const patient = await patientsRepository.create(makePatient());

    const result = await sut.execute({
      patientId: patient.id.toValue(),
      alergias: 'Dipirona',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(HealthRecordNotFoundError);
    }
  });
});
