import type { Request } from 'express';

/**
 * Member (da tabela Member, não confundir com session.user) do caller já
 * resolvido por PatientPermissionGuard — anexado à request pra
 * controller/service não precisar buscar de novo.
 */
export interface PatientCallerMember {
  id: string;
  role: string;
}

export interface PatientPermissionRequest extends Request {
  patientCallerMember?: PatientCallerMember;
}
