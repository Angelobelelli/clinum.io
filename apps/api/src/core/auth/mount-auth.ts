import type { INestApplication } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { Express } from 'express';
import { auth } from './auth';

export const AUTH_BASE_PATH = '/api/auth';

/**
 * Monta o handler HTTP do better-auth em /api/auth/*.
 *
 * Duas pegadinhas aqui:
 *   1. Precisa ser registrado ANTES do body-parser global do Nest: o
 *      better-auth lê o corpo cru da requisição, e se o Nest já tiver
 *      consumido o stream (json()/urlencoded() padrão), o handler
 *      trava/falha. Por isso o Nest é criado com `bodyParser: false` em
 *      main.ts, e o body-parser é habilitado manualmente ali, depois desta
 *      chamada.
 *   2. Usamos `.all()` no Express cru (via getHttpAdapter), não
 *      `app.use(path, handler)`: `use()` monta `handler` como sub-app e
 *      REESCREVE `req.url` removendo o prefixo do path montado, mas o
 *      better-auth espera receber a URL completa (incluindo /api/auth) para
 *      rotear internamente. `.all(path, handler)` casa a rota sem reescrever
 *      `req.url`.
 */
export function mountBetterAuth(app: INestApplication): void {
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.all(`${AUTH_BASE_PATH}/{*splat}`, toNodeHandler(auth));
}
