import { makePatient } from '@/test/factories/make-patient';
import { makeAgendamento } from '@/test/factories/make-agendamento';
import { InMemoryAgendamentosRepository } from '@/test/repositories/in-memory-agendamentos-repository';
import { InMemoryPatientsRepository } from '@/test/repositories/in-memory-patients-repository';
import { InMemoryProfissionaisRepository } from '@/test/repositories/in-memory-profissionais-repository';
import { CreateAgendamentoUseCase } from '@/modules/agenda/application/use-cases/create-agendamento';
import { AgendamentoConflictError } from '@/modules/agenda/application/use-cases/errors/agendamento-conflict-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { ProfissionalNotFoundError } from '@/modules/agenda/application/use-cases/errors/profissional-not-found-error';
import { PatientNotFoundError } from '@/modules/patients/application/use-cases/errors/patient-not-found-error';

describe('CreateAgendamentoUseCase', () => {
  let agendamentosRepository: InMemoryAgendamentosRepository;
  let profissionaisRepository: InMemoryProfissionaisRepository;
  let patientsRepository: InMemoryPatientsRepository;
  let sut: CreateAgendamentoUseCase;

  beforeEach(() => {
    agendamentosRepository = new InMemoryAgendamentosRepository();
    profissionaisRepository = new InMemoryProfissionaisRepository();
    patientsRepository = new InMemoryPatientsRepository();
    sut = new CreateAgendamentoUseCase(
      agendamentosRepository,
      profissionaisRepository,
      patientsRepository,
    );
  });

  it('cria um agendamento quando tudo é válido', async () => {
    profissionaisRepository.existingIds.add('profissional-1');
    const patient = await patientsRepository.create(makePatient());

    const result = await sut.execute({
      patientId: patient.id.toValue(),
      profissionalId: 'profissional-1',
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isRight()).toBe(true);
    expect(agendamentosRepository.items).toHaveLength(1);
  });

  it('staff recebe NotOwnAgendamentoError ao criar para outro profissional', async () => {
    const result = await sut.execute({
      patientId: 'patient-1',
      profissionalId: 'outro-profissional',
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
      caller: { id: 'staff-1', role: 'staff' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(NotOwnAgendamentoError);
    }
  });

  it('retorna ProfissionalNotFoundError quando o profissional não existe na organização', async () => {
    const result = await sut.execute({
      patientId: 'patient-1',
      profissionalId: 'profissional-inexistente',
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ProfissionalNotFoundError);
    }
  });

  it('retorna PatientNotFoundError quando o paciente não existe', async () => {
    profissionaisRepository.existingIds.add('profissional-1');

    const result = await sut.execute({
      patientId: 'patient-inexistente',
      profissionalId: 'profissional-1',
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(PatientNotFoundError);
    }
  });

  it('retorna AgendamentoConflictError quando há choque de horário', async () => {
    profissionaisRepository.existingIds.add('profissional-1');
    const patient = await patientsRepository.create(makePatient());
    await agendamentosRepository.create(
      makeAgendamento({
        profissionalId: 'profissional-1',
        status: 'agendado',
        dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
        dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
      }),
    );

    const result = await sut.execute({
      patientId: patient.id.toValue(),
      profissionalId: 'profissional-1',
      dataHoraInicio: new Date('2026-09-01T10:30:00.000Z'),
      dataHoraFim: new Date('2026-09-01T11:30:00.000Z'),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoConflictError);
    }
  });
});
