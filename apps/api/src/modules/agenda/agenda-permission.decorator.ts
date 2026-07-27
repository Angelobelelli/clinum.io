import { SetMetadata } from '@nestjs/common';
import type { statement } from '../../core/auth/access-control';

export const AGENDA_PERMISSION_KEY = 'agendaPermission';

export type AgendamentoAction = (typeof statement.agendamento)[number];

/**
 * Marca uma rota do módulo agenda com a ação exigida (ver resource
 * "agendamento" em access-control.ts) — lido por AgendaPermissionGuard, que
 * checa se o papel do member que está chamando (owner/admin/staff/
 * reception) autoriza essa ação. Não decide restrição de "próprio
 * recurso" (staff só vê/edita os próprios agendamentos) — isso é
 * responsabilidade de AgendaService, ver access-control.ts.
 */
export const RequireAgendaPermission = (
  action: AgendamentoAction,
): ReturnType<typeof SetMetadata> => SetMetadata(AGENDA_PERMISSION_KEY, action);
