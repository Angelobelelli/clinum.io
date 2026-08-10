import { calcularDataHoraFim } from '@/modules/agenda/enterprise/calcular-data-hora-fim';

describe('calcularDataHoraFim', () => {
  it('soma a duração em minutos à data de início', () => {
    const inicio = new Date('2026-09-01T10:00:00.000Z');

    const fim = calcularDataHoraFim(inicio, 30);

    expect(fim).toEqual(new Date('2026-09-01T10:30:00.000Z'));
  });

  it('funciona com duração que cruza a hora', () => {
    const inicio = new Date('2026-09-01T10:45:00.000Z');

    const fim = calcularDataHoraFim(inicio, 30);

    expect(fim).toEqual(new Date('2026-09-01T11:15:00.000Z'));
  });

  it('não modifica a data de início recebida', () => {
    const inicio = new Date('2026-09-01T10:00:00.000Z');
    const inicioCopia = new Date(inicio);

    calcularDataHoraFim(inicio, 30);

    expect(inicio).toEqual(inicioCopia);
  });
});
