import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/admin/access';

/**
 * Controle de acesso do plugin `admin` do better-auth — papel de
 * PLATAFORMA (dono do SaaS), cross-tenant. Arquivo deliberadamente separado
 * de ./access-control.ts (que é o controle de acesso do plugin
 * `organization`, escopado a uma única empresa cliente) para que os dois
 * conceitos nunca se misturem, nem visualmente nem estruturalmente.
 */
export const platformAc = createAccessControl(defaultStatements);

/**
 * Papel padrão de qualquer usuário (dono/equipe de clínica). Sem nenhuma
 * permissão sobre a administração da plataforma.
 */
export const platformUser = platformAc.newRole({
  user: [],
  session: [],
});

/**
 * Único papel com acesso à administração da plataforma — o dono do SaaS.
 * Permissões equivalentes ao papel "admin" padrão do plugin (todas as
 * ações de user/session), só que sob o nome "super_admin" para nunca ser
 * confundido com o role "admin" de uma Organization (Member.role).
 */
export const platformSuperAdmin = platformAc.newRole({
  user: [
    'create',
    'list',
    'set-role',
    'ban',
    'impersonate',
    'delete',
    'set-password',
    'get',
    'update',
  ],
  session: ['list', 'revoke', 'delete'],
});
