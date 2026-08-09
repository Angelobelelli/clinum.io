/**
 * Restrição de "próprio recurso": staff só acessa/cria agendamentos onde é
 * o profissional; qualquer outro papel autorizado pela guard (owner/admin/
 * reception) já passou pela checagem de ação em PermissionGuard (ver
 * infra/auth/permission.guard.ts) e não tem essa restrição adicional. Ver
 * access-control.ts para o porquê disso não estar na guard (que só decide
 * autorização por papel, não por :id).
 */
export interface CallerMember {
  id: string;
  role: string;
}

export function isOwnResource(
  caller: CallerMember,
  profissionalId: string,
): boolean {
  return caller.role !== 'staff' || profissionalId === caller.id;
}
