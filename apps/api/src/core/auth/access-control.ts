import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/organization/access';

/**
 * Statements herdados do plugin Organization (organization/member/invitation/team/ac)
 * + o resource "patient" (primeiro recurso de negócio real, ver
 * modules/patients/). Módulos futuros (agenda, financeiro) devem seguir o
 * mesmo padrão: um resource novo aqui, com as ações que cada role pode
 * fazer.
 */
export const statement = {
  ...defaultStatements,
  patient: [
    'create',
    'read',
    'read_health_record',
    'update',
    'update_health_record',
    'delete',
  ],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  patient: [
    'create',
    'read',
    'read_health_record',
    'update',
    'update_health_record',
    'delete',
  ],
});

export const admin = ac.newRole({
  organization: ['update'],
  invitation: ['create', 'cancel'],
  member: ['create', 'update', 'delete'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  patient: [
    'create',
    'read',
    'read_health_record',
    'update',
    'update_health_record',
    'delete',
  ],
});

export const member = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ['read'],
  // "member" hoje não tem acesso a nenhum recurso de negócio (ver
  // access-control.ts topo — papel genérico, pouco usado na prática).
  patient: [],
});

/**
 * Profissional de saúde/beleza (staff). Tem acesso total a Patient/ficha de
 * saúde — é quem de fato atende o paciente.
 */
export const staff = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ['read'],
  patient: [
    'create',
    'read',
    'read_health_record',
    'update',
    'update_health_record',
    'delete',
  ],
});

/**
 * Recepcionista. Pode convidar/gerenciar outros membros operacionais
 * (staff/reception) mas não administra a organização em si. Em Patient: cria
 * e vê/atualiza os dados básicos (nome, contato, CPF), mas NUNCA a ficha de
 * saúde — nem read nem update.
 */
export const reception = ac.newRole({
  organization: [],
  member: ['create', 'update'],
  invitation: ['create'],
  team: [],
  ac: ['read'],
  patient: ['create', 'read', 'update'],
});

/**
 * Mapa role (string, como salvo em Member.role) -> objeto Role, para
 * guards resolverem permissões sem precisar de um switch/if espalhado (ver
 * modules/patients/patient-permission.guard.ts). Adicione aqui qualquer
 * role novo que passe a existir.
 */
export const roleByName = {
  owner,
  admin,
  member,
  staff,
  reception,
} as const;
