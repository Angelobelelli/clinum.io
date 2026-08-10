import { makePatient } from '@/test/factories/make-patient';
import { makeServico } from '@/test/factories/make-servico';
import { makeAgendamento } from '@/test/factories/make-agendamento';
import { InMemoryAgendamentosRepository } from '@/test/repositories/in-memory-agendamentos-repository';
import { InMemoryPatientsRepository } from '@/test/repositories/in-memory-patients-repository';
import { InMemoryProfissionaisRepository } from '@/test/repositories/in-memory-profissionais-repository';
import { InMemoryServicosRepository } from '@/test/repositories/in-memory-servicos-repository';
import { AgendamentoConflictError } from '@/modules/agenda/application/use-cases/errors/agendamento-conflict-error';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { AgendamentoTerminalStateError } from '@/modules/agenda/application/use-cases/errors/agendamento-terminal-state-error';
import { InvalidAgendamentoIntervalError } from '@/modules/agenda/application/use-cases/errors/invalid-agendamento-interval-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';
import { ServicoInativoError } from '@/modules/agenda/application/use-cases/errors/servico-inativo-error';
import { UpdateAgendamentoUseCase } from '@/modules/agenda/application/use-cases/update-agendamento';
import { ServicoNotFoundError } from '@/modules/servicos/application/use-cases/errors/servico-not-found-error';

describe('UpdateAgendamentoUseCase', () => {
  let agendamentosRepository: InMemoryAgendamentosRepository;
  let profissionaisRepository: InMemoryProfissionaisRepository;
  let patientsRepository: InMemoryPatientsRepository;
  let servicosRepository: InMemoryServicosRepository;
  let sut: UpdateAgendamentoUseCase;

  beforeEach(() => {
    agendamentosRepository = new InMemoryAgendamentosRepository();
    profissionaisRepository = new InMemoryProfissionaisRepository();
    patientsRepository = new InMemoryPatientsRepository();
    servicosRepository = new InMemoryServicosRepository();
    sut = new UpdateAgendamentoUseCase(
      agendamentosRepository,
      profissionaisRepository,
      patientsRepository,
      servicosRepository,
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

  it('recalcula dataHoraFim a partir do novo servicoId, mantendo dataHoraInicio atual', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({
        dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
        dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
      }),
    );
    const servico = makeServico({ duracaoMinutos: 20 });
    await servicosRepository.create(servico);

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
      servicoId: servico.id.toValue(),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.agendamento.dataHoraFim).toEqual(
        new Date('2026-09-01T10:20:00.000Z'),
      );
      expect(result.value.agendamento.servicoId).toBe(servico.id.toValue());
    }
  });

  it('retorna ServicoNotFoundError quando o novo servicoId não existe', async () => {
    const agendamento = await agendamentosRepository.create(makeAgendamento());

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
      servicoId: 'servico-inexistente',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ServicoNotFoundError);
    }
  });

  it('retorna ServicoInativoError quando o novo servicoId está desativado', async () => {
    const agendamento = await agendamentosRepository.create(makeAgendamento());
    const servico = makeServico({ ativo: false });
    await servicosRepository.create(servico);

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
      servicoId: servico.id.toValue(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ServicoInativoError);
    }
  });

  it('detecta choque de horário ao trocar de serviço (dataHoraFim recalculado)', async () => {
    const agendamento = await agendamentosRepository.create(
      makeAgendamento({
        profissionalId: 'profissional-1',
        dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
        dataHoraFim: new Date('2026-09-01T10:30:00.000Z'),
      }),
    );
    await agendamentosRepository.create(
      makeAgendamento({
        profissionalId: 'profissional-1',
        status: 'agendado',
        dataHoraInicio: new Date('2026-09-01T10:45:00.000Z'),
        dataHoraFim: new Date('2026-09-01T11:15:00.000Z'),
      }),
    );
    // 60min de duração a partir das 10:00 vai até 11:00, sobrepondo o
    // outro agendamento do mesmo profissional (10:45–11:15).
    const servico = makeServico({ duracaoMinutos: 60 });
    await servicosRepository.create(servico);

    const result = await sut.execute({
      agendamentoId: agendamento.id.toValue(),
      caller: { id: 'owner-1', role: 'owner' },
      servicoId: servico.id.toValue(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AgendamentoConflictError);
    }
  });
});
