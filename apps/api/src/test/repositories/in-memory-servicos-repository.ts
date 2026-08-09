import { PaginatedResult } from '@/core/pagination/paginated-result';
import {
  FindManyServicosFilter,
  ServicosRepository,
} from '@/modules/servicos/application/repositories/servicos-repository';
import { Servico } from '@/modules/servicos/enterprise/entities/servico';

export class InMemoryServicosRepository implements ServicosRepository {
  public items: Servico[] = [];

  create(servico: Servico): Promise<void> {
    this.items.push(servico);

    return Promise.resolve();
  }

  findById(id: string): Promise<Servico | null> {
    const servico = this.items.find((item) => item.id.toValue() === id);

    return Promise.resolve(servico ?? null);
  }

  findMany({
    ativo,
    page,
    perPage,
  }: FindManyServicosFilter): Promise<PaginatedResult<Servico>> {
    const filtered =
      ativo === undefined
        ? this.items
        : this.items.filter((item) => item.ativo === ativo);
    const start = (page - 1) * perPage;

    return Promise.resolve({
      items: filtered.slice(start, start + perPage),
      total: filtered.length,
      page,
      perPage,
    });
  }

  save(servico: Servico): Promise<void> {
    const index = this.items.findIndex(
      (item) => item.id.toValue() === servico.id.toValue(),
    );

    if (index >= 0) {
      this.items[index] = servico;
    }

    return Promise.resolve();
  }
}
