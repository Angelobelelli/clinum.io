import { makePatient } from '../../../../test/factories/make-patient';
import { InMemoryPatientsRepository } from '../../../../test/repositories/in-memory-patients-repository';
import { ListPatientsUseCase } from './list-patients';

describe('ListPatientsUseCase', () => {
  let patientsRepository: InMemoryPatientsRepository;
  let sut: ListPatientsUseCase;

  beforeEach(() => {
    patientsRepository = new InMemoryPatientsRepository();
    sut = new ListPatientsUseCase(patientsRepository);
  });

  it('lista os pacientes da página pedida', async () => {
    await patientsRepository.create(makePatient({ nome: 'Paciente 1' }));
    await patientsRepository.create(makePatient({ nome: 'Paciente 2' }));

    const result = await sut.execute({ page: 1, perPage: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('respeita page/perPage', async () => {
    await patientsRepository.create(makePatient({ nome: 'Paciente 1' }));
    await patientsRepository.create(makePatient({ nome: 'Paciente 2' }));
    await patientsRepository.create(makePatient({ nome: 'Paciente 3' }));

    const result = await sut.execute({ page: 2, perPage: 2 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
    expect(result.perPage).toBe(2);
  });
});
