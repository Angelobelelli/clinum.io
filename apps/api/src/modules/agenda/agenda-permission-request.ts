import type { Request } from 'express';

/**
 * Member (da tabela Member, não confundir com session.user) do caller já
 * resolvido por AgendaPermissionGuard — anexado à request pra
 * controller/service não precisar buscar de novo. Mesmo padrão de
 * PatientCallerMember (modules/patients/patient-permission-request.ts).
 *
 * userId (o id de User/session, diferente de id acima que é Member.id) é
 * usado só por AgendaService.reverter(), para preencher
 * AgendamentoAuditLog.adminUserId.
 */
export interface AgendaCallerMember {
  id: string;
  role: string;
  userId: string;
}

export interface AgendaPermissionRequest extends Request {
  agendaCallerMember?: AgendaCallerMember;
}
