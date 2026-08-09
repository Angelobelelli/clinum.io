import { makePatient } from '@/test/factories/make-patient';
import { makeAgendamento } from '@/test/factories/make-agendamento';
import { InMemoryAgendamentosRepository } from '@/test/repositories/in-memory-agendamentos-repository';
import { InMemoryPatientsRepository } from '@/test/repositories/in-memory-patients-repository';
import { InMemoryProfissionaisRepository } from '@/test/repositories/in-memory-profissionais-repository';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';
import { InvalidAgendamentoIntervalError } from '@/modules/agenda/application/use-cases/errors/invalid-agendamento-interval-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { UpdateAgendamentoUseCase } from '@/modules/agenda/application/use-cases/update-agendamento';

describe('UpdateAgendamentoUseCase', () => {
  let agendamentosRepository: InMemoryAgendamentosRepository;
  let profissionaisRepository: InMemoryProfissionaisRepository;
  let patientsRepository: InMemoryPatientsRepository;
  let sut: UpdateAgendamentoUseCase;

  beforeEach(() => {
    agendamentosRepository = new InMemoryAgendamentosRepository();
    profissionaisRepository = new InMemoryProfissionaisRepository();
    patientsRepository = new InMemoryPatientsRepository();
    sut = new UpdateAgendamentoUseCase(
      agendamentosRepository,
      profissionaisRepository,
      patientsRepository,
    );
  });

  it('atualiza a observação sem mexer no horário', async () => {
    const agendamento = await agendamentosRepository.create(makeAgendamento());

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
      observacao: 'nova observação',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.agendamento.observacao).toBe('nova observação');
    }
  });

  it('retorna AgendamentoNotFoundError quando o agendamento não existe', async () => {
    const result = await sut.execute({
      agendamentoId: 'inexistente',
      caller: { id: 'owner-1', role: 'owner' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoNotFoundError);
    }
  });

  it('staff recebe NotOwnAgendamentoError ao tentar atualizar agendamento de outro profissional', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({ profissionalId: 'staff-2' }),
    );

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'staff-1', role: 'staff' },
      observacao: 'tentando mexer',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(NotOwnAgendamentoError);
    }
  });

  it('retorna AgendamentoTerminalStateError quando o agendamento já está cancelado', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({ status: 'cancelado' }),
    );

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
      observacao: 'tentando mexer num cancelado',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoTerminalStateError);
    }
  });

  it('retorna InvalidAgendamentoIntervalError quando o novo intervalo é inválido', async () => {
    const agendamento = await agendamentosRepository.create(makeAgendamento());

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
      dataHoraInicio: new Date('2026-09-01T12:00:00.000Z'),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidAgendamentoIntervalError);
    }
  });

  it('valida o novo paciente quando patientId muda', async () => {
    const agendamento = await agendamentosRepository.create(makeAgendamento());

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
      patientId: 'patient-inexistente',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('aplica a mudança de paciente quando o novo paciente existe', async () => {
    const agendamento = await agendamentosRepository.create(makeAgendamento());
    const novoPaciente = await patientsRepository.create(makePatient());

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
      patientId: novoPaciente.id.toValue(),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.agendamento.patientId).toBe(
        novoPaciente.id.toValue(),
      );
    }
  });
});
