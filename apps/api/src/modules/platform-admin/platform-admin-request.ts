import type { Request } from 'express';

/**
 * Sessão de plataforma já validada por PlatformAdminGuard. O guard anexa
 * isso à requisição para que PlatformAdminAuditInterceptor (que roda depois
 * do guard, mas antes do handler) não precise buscar a sessão de novo.
 */
export interface PlatformAdminSession {
  user: { id: string; role?: string | null };
}

export interface PlatformAdminRequest extends Request {
  platformAdminSession?: PlatformAdminSession;
}
