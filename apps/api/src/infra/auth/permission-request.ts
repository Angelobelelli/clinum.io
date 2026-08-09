import type { Request } from 'express';

/**
 * Member (da tabela Member, não confundir com session.user) do caller já
 * resolvido por PermissionGuard — anexado à request pra controller/service
 * não precisar buscar de novo. userId (id de User/session) sempre incluído
 * agora (antes só o módulo agenda anexava, pra AgendaService.reverter()
 * preencher AgendamentoAuditLog.adminUserId) — é barato de manter e evita
 * um tipo por módulo.
 *
 * Substitui os tipos por módulo (PatientCallerMember/PatientPermissionRequest,
 * AgendaCallerMember/AgendaPermissionRequest, etc.).
 */
export interface CallerMember {
  id: string;
  role: string;
  userId: string;
}

export interface PermissionRequest extends Request {
  callerMember?: CallerMember;
}
