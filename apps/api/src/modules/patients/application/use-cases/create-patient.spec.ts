import { InMemoryPatientHealthRecordsRepository } from '@/test/repositories/in-memory-patient-health-records-repository';
import { InMemoryPatientsRepository } from '@/test/repositories/in-memory-patients-repository';
import { CreatePatientUseCase } from '@/modules/patients/application/use-cases/create-patient';

describe('CreatePatientUseCase', () => {
  let patientsRepository: InMemoryPatientsRepository;
  let patientHealthRecordsRepository: InMemoryPatientHealthRecordsRepository;
  let sut: CreatePatientUseCase;

  beforeEach(() => {
    patientsRepository = new InMemoryPatientsRepository();
    patientHealthRecordsRepository =
      new InMemoryPatientHealthRecordsRepository();
    sut = new CreatePatientUseCase(
      patientsRepository,
      patientHealthRecordsRepository,
    );
  });

  it('cria um paciente e uma ficha de saúde vazia', async () => {
    const { patient } = await sut.execute({ nome: 'Paciente Teste' });

    expect(patient.nome).toBe('Paciente Teste');
    expect(patientsRepository.items).toHaveLength(1);
    expect(patientHealthRecordsRepository.items).toHaveLength(1);
    expect(patientHealthRecordsRepository.items[0].patientId).toBe(
      patient.id.toValue(),
    );
  });
});
