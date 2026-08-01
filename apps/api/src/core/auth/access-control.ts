import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/organization/access';

/**
 * Statements herdados do plugin Organization (organization/member/invitation/team/ac)
 * + os resources "patient" e "agendamento" (recursos de negócio reais, ver
 * modules/patients/ e modules/agenda/). Módulos futuros (financeiro, etc.)
 * devem seguir o mesmo padrão: um resource novo aqui, com as ações que
 * cada role pode fazer.
 *
 * "agendamento" não tem uma ação de "read own"/"update own" separada — a
 * restrição de staff a APENAS os próprios agendamentos (profissionalId ===
 * o próprio Member) é uma restrição de LINHA, que o sistema ac do
 * better-auth (boolean, por role) não modela. Ela é reforçada na camada de
 * aplicação, em modules/agenda/agenda.service.ts, usando o mesmo
 * mecanismo de "caller member anexado à request" usado por todos os
 * módulos (ver core/auth/permission.guard.ts e permission-request.ts) —
 * o mais próximo do padrão existente que faz sentido pra esse tipo de
 * restrição.
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
  agendamento: [
    'create',
    'read',
    'update',
    'cancel',
    'update_status',
    'revert',
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
  // Acesso total a todos os agendamentos da organização, de qualquer
  // profissional (sem restrição de "próprio recurso"). "revert" (reverter
  // um agendamento de estado terminal — cancelado/realizado/falta — de
  // volta pra agendado/confirmado) é exclusivo de owner/admin, ver
  // AgendaService.reverter().
  agendamento: [
    'create',
    'read',
    'update',
    'cancel',
    'update_status',
    'revert',
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
  agendamento: [
    'create',
    'read',
    'update',
    'cancel',
    'update_status',
    'revert',
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
  agendamento: [],
});

/**
 * Profissional de saúde/beleza (staff). Tem acesso total a Patient/ficha de
 * saúde — é quem de fato atende o paciente.
 *
 * Em agendamento: as MESMAS ações de owner/admin (inclusive update_status,
 * pra marcar o próprio atendimento como realizado/falta), mas restrito aos
 * agendamentos onde profissionalId é o próprio Member — reforçado em
 * AgendaService, não aqui (ver nota em "statement" acima). SEM "revert" —
 * reverter um estado terminal é exclusivo de owner/admin.
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
  agendamento: ['create', 'read', 'update', 'cancel', 'update_status'],
});

/**
 * Recepcionista. Pode convidar/gerenciar outros membros operacionais
 * (staff/reception) mas não administra a organização em si. Em Patient: cria
 * e vê/atualiza os dados básicos (nome, contato, CPF), mas NUNCA a ficha de
 * saúde — nem read nem update.
 *
 * Em agendamento: cria/lê/atualiza/cancela de QUALQUER profissional da
 * organização (sem restrição de "próprio recurso" — essa restrição é só
 * pra staff). DECISÃO: reception NÃO tem update_status — quem marca
 * realizado/falta é o profissional que de fato atendeu (staff) ou
 * owner/admin; reception organiza a agenda, mas não atesta o atendimento.
 * Não especificado explicitamente no pedido original — documentado aqui
 * por ser uma decisão de modelagem. Também SEM "revert" — exclusivo de
 * owner/admin.
 */
export const reception = ac.newRole({
  organization: [],
  member: ['create', 'update'],
  invitation: ['create'],
  team: [],
  ac: ['read'],
  patient: ['create', 'read', 'update'],
  agendamento: ['create', 'read', 'update', 'cancel'],
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
