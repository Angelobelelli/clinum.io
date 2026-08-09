import { Either, left, right } from '@/core/either';
import { Agendamento } from '@/modules/agenda/enterprise/entities/agendamento';
import { AgendamentosRepository } from '@/modules/agenda/application/repositories/agendamentos-repository';
import {
  CallerMember,
  isOwnResource,
} from '@/modules/agenda/application/policies/agenda-ownership-policy';
import { AgendamentoNotFoundError } from '@/modules/agenda/application/use-cases/errors/agendamento-not-found-error';
import { NotOwnAgendamentoError } from '@/modules/agenda/application/use-cases/errors/not-own-agendamento-error';

/**
 * Helper interno reutilizado por update/cancel/update-status/revert — não é
 * um use-case ligado a uma rota própria, só evita repetir "busca + checa
 * 404 + checa 403 de próprio recurso" 4 vezes (mesmo papel do antigo
 * AgendaService.findOne()).
 */
export async function findOwnedAgendamento(
  agendamentosRepository: AgendamentosRepository,
  id: string,
  caller: CallerMember,
): Promise<
  Either<AgendamentoNotFoundError | NotOwnAgendamentoError, Agendamento>
> {
  const agendamento = await agendamentosRepository.findById(id);

  if (!agendamento) {
    return left(new AgendamentoNotFoundError());
  }

  if (!isOwnResource(caller, agendamento.profissionalId)) {
    return left(new NotOwnAgendamentoError());
  }

  return right(agendamento);
}
