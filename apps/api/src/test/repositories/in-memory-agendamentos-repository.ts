import { PaginatedResult } from '@/core/pagination/paginated-result';
import {
  AgendamentosRepository,
  FindManyAgendamentosFilter,
} from '@/modules/agenda/application/repositories/agendamentos-repository';
import {
  Agendamento,
  STATUS_QUE_BLOQUEIAM_HORARIO,
} from '@/modules/agenda/enterprise/entities/agendamento';

export class InMemoryAgendamentosRepository implements AgendamentosRepository {
  public items: Agendamento[] = [];

  findById(id: string): Promise<Agendamento | null> {
    const agendamento = this.items.find((item) => item.id.toValue() === id);

    return Promise.resolve(agendamento ?? null);
  }

  findByGoogleEventId(googleEventId: string): Promise<Agendamento | null> {
    const agendamento = this.items.find(
      (item) => item.googleEventId === googleEventId,
    );

    return Promise.resolve(agendamento ?? null);
  }

  findMany(
    filter: FindManyAgendamentosFilter,
  ): Promise<PaginatedResult<Agendamento>> {
    const filtered = this.items.filter((item) => {
      if (
        filter.profissionalId &&
        item.profissionalId !== filter.profissionalId
      ) {
        return false;
      }
      if (filter.dataInicio && item.dataHoraInicio < filter.dataInicio) {
        return false;
      }
      if (filter.dataFim && item.dataHoraInicio > filter.dataFim) {
        return false;
      }
      return true;
    });

    const start = (filter.page - 1) * filter.perPage;

    return Promise.resolve({
      items: filtered.slice(start, start + filter.perPage),
      total: filtered.length,
      page: filter.page,
      perPage: filter.perPage,
    });
  }

  findManyBlockingForProfissional(
    profissionalId: string,
  ): Promise<Agendamento[]> {
    const filtered = this.items.filter(
      (item) =>
        item.profissionalId === profissionalId &&
        STATUS_QUE_BLOQUEIAM_HORARIO.includes(item.status),
    );

    return Promise.resolve(filtered);
  }

  create(agendamento: Agendamento): Promise<Agendamento> {
    this.items.push(agendamento);

    return Promise.resolve(agendamento);
  }

  save(agendamento: Agendamento): Promise<Agendamento> {
    const index = this.items.findIndex(
      (item) => item.id.toValue() === agendamento.id.toValue(),
    );

    if (index >= 0) {
      this.items[index] = agendamento;
    }

    return Promise.resolve(agendamento);
  }
}
