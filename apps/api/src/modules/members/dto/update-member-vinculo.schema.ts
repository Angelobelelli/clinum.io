import { z } from 'zod';
import { MemberStatus, TipoVinculo } from '../../../../generated/prisma/enums';

/**
 * tipoVinculo/status são enums NATIVOS do Postgres (ver prisma/schema.prisma)
 * porque, ao contrário de Member.role, NUNCA são escritos pelo better-auth —
 * só por este módulo (members.service.ts), via Prisma direto.
 */
export const updateMemberVinculoSchema = z.object({
  tipoVinculo: z.enum(TipoVinculo).optional(),
  status: z.enum(MemberStatus).optional(),
});

export type UpdateMemberVinculoInput = z.infer<
  typeof updateMemberVinculoSchema
>;
