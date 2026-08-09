import { PaginatedResult } from '@/core/pagination/paginated-result';

/**
 * Envelope HTTP padrão de qualquer endpoint "findAll" paginado:
 * { data: [...], meta: { page, perPage, total, totalPages } }.
 * `result.items` já deve vir passado pelo presenter do módulo (ex:
 * PatientPresenter.toListItem) — este helper só monta o envelope.
 */
export function toPaginatedHTTP<T>(result: PaginatedResult<T>) {
  return {
    data: result.items,
    meta: {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      totalPages:
        result.total === 0 ? 0 : Math.ceil(result.total / result.perPage),
    },
  };
}
