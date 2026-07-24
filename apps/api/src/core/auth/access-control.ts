import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/organization/access';

/**
 * Statements herdados do plugin Organization (organization/member/invitation/team/ac).
 * Nenhum recurso de negócio ainda — isso será estendido quando módulos como
 * agenda/financeiro precisarem de permissões próprias.
 */
export const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
});

export const admin = ac.newRole({
  organization: ['update'],
  invitation: ['create', 'cancel'],
  member: ['create', 'update', 'delete'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
});

export const member = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ['read'],
});

/**
 * Profissional de saúde/beleza (staff). Por enquanto com as mesmas permissões
 * de "member" — sem acesso administrativo à organização. Deve ganhar
 * permissões de negócio (ex: gerenciar a própria agenda) quando esses
 * módulos existirem.
 */
export const staff = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ['read'],
});

/**
 * Recepcionista. Pode convidar/gerenciar outros membros operacionais
 * (staff/reception) mas não administra a organização em si.
 */
export const reception = ac.newRole({
  organization: [],
  member: ['create', 'update'],
  invitation: ['create'],
  team: [],
  ac: ['read'],
});
