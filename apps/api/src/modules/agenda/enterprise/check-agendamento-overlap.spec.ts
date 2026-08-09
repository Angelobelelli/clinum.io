import { encontrarConflitoDeHorario } from '@/modules/agenda/enterprise/check-agendamento-overlap';

describe('encontrarConflitoDeHorario', () => {
  const existente = {
    id: 'existente-1',
    dataHoraInicio: new Date('2026-08-01T10:00:00Z'),
    dataHoraFim: new Date('2026-08-01T11:00:00Z'),
  };

  it('detecta sobreposição total (mesmo intervalo)', () => {
    const conflito = encontrarConflitoDeHorario(
      {
        dataHoraInicio: new Date('2026-08-01T10:00:00Z'),
        dataHoraFim: new Date('2026-08-01T11:00:00Z'),
      },
      [existente],
    );

    expect(conflito).toBe(existente);
  });

  it('detecta sobreposição parcial (começa antes, termina no meio)', () => {
    const conflito = encontrarConflitoDeHorario(
      {
        dataHoraInicio: new Date('2026-08-01T09:30:00Z'),
        dataHoraFim: new Date('2026-08-01T10:30:00Z'),
      },
      [existente],
    );

    expect(conflito).toBe(existente);
  });

  it('detecta candidato totalmente contido no existente', () => {
    const conflito = encontrarConflitoDeHorario(
      {
        dataHoraInicio: new Date('2026-08-01T10:15:00Z'),
        dataHoraFim: new Date('2026-08-01T10:45:00Z'),
      },
      [existente],
    );

    expect(conflito).toBe(existente);
  });

  it('não considera choque quando os intervalos apenas se tocam', () => {
    const conflito = encontrarConflitoDeHorario(
      {
        dataHoraInicio: new Date('2026-08-01T11:00:00Z'),
        dataHoraFim: new Date('2026-08-01T12:00:00Z'),
      },
      [existente],
    );

    expect(conflito).toBeUndefined();
  });

  it('não considera choque quando os intervalos não se tocam', () => {
    const conflito = encontrarConflitoDeHorario(
      {
        dataHoraInicio: new Date('2026-08-01T12:00:00Z'),
        dataHoraFim: new Date('2026-08-01T13:00:00Z'),
      },
      [existente],
    );

    expect(conflito).toBeUndefined();
  });

  it('ignora o próprio registro ao atualizar/remarcar (mesmo id)', () => {
    const conflito = encontrarConflitoDeHorario(
      {
        id: 'existente-1',
        dataHoraInicio: new Date('2026-08-01T10:00:00Z'),
        dataHoraFim: new Date('2026-08-01T11:00:00Z'),
      },
      [existente],
    );

    expect(conflito).toBeUndefined();
  });

  it('retorna o primeiro conflito quando há múltiplos agendamentos existentes', () => {
    const outro = {
      id: 'existente-2',
      dataHoraInicio: new Date('2026-08-01T13:00:00Z'),
      dataHoraFim: new Date('2026-08-01T14:00:00Z'),
    };

    const conflito = encontrarConflitoDeHorario(
      {
        dataHoraInicio: new Date('2026-08-01T13:30:00Z'),
        dataHoraFim: new Date('2026-08-01T14:30:00Z'),
      },
      [existente, outro],
    );

    expect(conflito).toBe(outro);
  });
});
