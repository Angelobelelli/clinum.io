import { makePatient } from '@/test/factories/make-patient';
import { makeServico } from '@/test/factories/make-servico';
import { makeAgendamento } from '@/test/factories/make-agendamento';
import { FakeAgendaExternalCalendarSyncPort } from '@/test/fakes/fake-agenda-external-calendar-sync-port';
import { InMemoryAgendamentosRepository } from '@/test/repositories/in-memory-agendamentos-repository';
import { InMemoryPatientsRepository } from '@/test/repositories/in-memory-patients-repository';
import { InMemoryProfissionaisRepository } from '@/test/repositories/in-memory-profissionais-repository';
import { InMemoryServicosRepository } from '@/test/repositories/in-memory-servicos-repository';
import { CreateAgendamentoUseCase } from '@/modules/agenda/application/use-cases/create-agendamento';
import { AgendamentoConflictError } from '@/modules/agenda/application/use-cases/errors/agendamento-conflict-error';
import { ExternalCalendarConflictError } from '@/modules/agenda/application/use-cases/errors/external-calendar-conflict-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { ProfissionalNotFoundError } from '@/modules/agenda/application/use-cases/errors/profissional-not-found-error';
import { ServicoInativoError } from '@/modules/agenda/application/use-cases/errors/servico-inativo-error';
import { PatientNotFoundError } from '@/modules/patients/application/use-cases/errors/patient-not-found-error';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';

describe('CreateAgendamentoUseCase', () => {
  let agendamentosRepository: InMemoryAgendamentosRepository;
  let profissionaisRepository: InMemoryProfissionaisRepository;
  let patientsRepository: InMemoryPatientsRepository;
  let servicosRepository: InMemoryServicosRepository;
  let agendaExternalCalendarSyncPort: FakeAgendaExternalCalendarSyncPort;
  let sut: CreateAgendamentoUseCase;

  beforeEach(() => {
    agendamentosRepository = new InMemoryAgendamentosRepository();
    profissionaisRepository = new InMemoryProfissionaisRepository();
    patientsRepository = new InMemoryPatientsRepository();
    servicosRepository = new InMemoryServicosRepository();
    agendaExternalCalendarSyncPort = new FakeAgendaExternalCalendarSyncPort();
    sut = new CreateAgendamentoUseCase(
      agendamentosRepository,
      profissionaisRepository,
      patientsRepository,
      servicosRepository,
      agendaExternalCalendarSyncPort,
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

  it('calcula dataHoraFim a partir de servicoId, ignorando dataHoraFim manual', async () => {
    profissionaisRepository.existingIds.add('profissional-1');
    const patient = await patientsRepository.create(makePatient());
    const servico = makeServico({ duracaoMinutos: 45 });
    await servicosRepository.create(servico);

    const result = await sut.execute({
      patientId: patient.id.toValue(),
      profissionalId: 'profissional-1',
      servicoId: servico.id.toValue(),
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.agendamento.dataHoraFim).toEqual(
        new Date('2026-09-01T10:45:00.000Z'),
      );
      expect(result.value.agendamento.servicoId).toBe(servico.id.toValue());
    }
  });

  it('retorna ServicoNotFoundError quando servicoId não existe', async () => {
    profissionaisRepository.existingIds.add('profissional-1');
    const patient = await patientsRepository.create(makePatient());

    const result = await sut.execute({
      patientId: patient.id.toValue(),
      profissionalId: 'profissional-1',
      servicoId: 'servico-inexistente',
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ServicoNotFoundError);
    }
  });

  it('retorna ServicoInativoError quando o serviço está desativado', async () => {
    profissionaisRepository.existingIds.add('profissional-1');
    const patient = await patientsRepository.create(makePatient());
    const servico = makeServico({ ativo: false });
    await servicosRepository.create(servico);

    const result = await sut.execute({
      patientId: patient.id.toValue(),
      profissionalId: 'profissional-1',
      servicoId: servico.id.toValue(),
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ServicoInativoError);
    }
  });

  it('detecta choque de horário usando o dataHoraFim calculado a partir do serviço', async () => {
    profissionaisRepository.existingIds.add('profissional-1');
    const patient = await patientsRepository.create(makePatient());
    const servico = makeServico({ duracaoMinutos: 60 });
    await servicosRepository.create(servico);
    await agendamentosRepository.create(
      makeAgendamento({
        profissionalId: 'profissional-1',
        status: 'agendado',
        dataHoraInicio: new Date('2026-09-01T10:30:00.000Z'),
        dataHoraFim: new Date('2026-09-01T11:30:00.000Z'),
      }),
    );

    // Início às 10:00 + 60min de duração do serviço = fim às 11:00, que
    // sobrepõe o agendamento existente (10:30–11:30) mesmo sem dataHoraFim
    // manual nenhuma ter sido mandada.
    const result = await sut.execute({
      patientId: patient.id.toValue(),
      profissionalId: 'profissional-1',
      servicoId: servico.id.toValue(),
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoConflictError);
    }
  });

  it('retorna ExternalCalendarConflictError quando o Google Calendar indica ocupado', async () => {
    profissionaisRepository.existingIds.add('profissional-1');
    const patient = await patientsRepository.create(makePatient());
    agendaExternalCalendarSyncPort.busy = true;

    const result = await sut.execute({
      patientId: patient.id.toValue(),
      profissionalId: 'profissional-1',
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ExternalCalendarConflictError);
    }
    expect(agendamentosRepository.items).toHaveLength(0);
  });

  it('enfileira a sincronização externa após criar com sucesso', async () => {
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
    expect(agendaExternalCalendarSyncPort.calls).toHaveLength(1);
    expect(agendaExternalCalendarSyncPort.calls[0]).toMatchObject({
      profissionalId: 'profissional-1',
      type: 'upsert',
      snapshot: { patientNome: patient.nome },
    });
  });
});
