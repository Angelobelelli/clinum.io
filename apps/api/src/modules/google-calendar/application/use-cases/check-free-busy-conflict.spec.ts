import { FakeGoogleCalendarGateway } from '@/test/fakes/fake-google-calendar-gateway';
import { InMemoryGoogleCalendarConnectionsRepository } from '@/test/repositories/in-memory-google-calendar-connections-repository';
import { makeGoogleCalendarConnection } from '@/test/factories/make-google-calendar-connection';
import { CheckFreeBusyConflictUseCase } from '@/modules/google-calendar/application/use-cases/check-free-busy-conflict';

describe('CheckFreeBusyConflictUseCase', () => {
  let connectionsRepository: InMemoryGoogleCalendarConnectionsRepository;
  let gateway: FakeGoogleCalendarGateway;
  let sut: CheckFreeBusyConflictUseCase;

  beforeEach(() => {
    connectionsRepository = new InMemoryGoogleCalendarConnectionsRepository();
    gateway = new FakeGoogleCalendarGateway();
    sut = new CheckFreeBusyConflictUseCase(connectionsRepository, gateway);
  });

  it('retorna sem conflito, sem chamar o gateway, quando o profissional não tem conexão', async () => {
    const result = await sut.execute({
      profissionalId: 'profissional-sem-conexao',
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
    });

    expect(result.conflict).toBe(false);
  });

  it('retorna conflito quando o Google indica ocupado', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'profissional-1' }),
    );
    gateway.busy = true;

    const result = await sut.execute({
      profissionalId: 'profissional-1',
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
    });

    expect(result.conflict).toBe(true);
  });

  it('fail-open: retorna sem conflito quando a chamada ao Google falha', async () => {
    await connectionsRepository.create(
      makeGoogleCalendarConnection({ memberId: 'profissional-1' }),
    );
    gateway.shouldFailFreeBusy = true;

    const result = await sut.execute({
      profissionalId: 'profissional-1',
      dataHoraInicio: new Date('2026-09-01T10:00:00.000Z'),
      dataHoraFim: new Date('2026-09-01T11:00:00.000Z'),
    });

    expect(result.conflict).toBe(false);
  });
});
