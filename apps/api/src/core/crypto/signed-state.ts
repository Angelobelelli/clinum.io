import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Payload assinado (HMAC-SHA256) com expiração — usado para correlacionar
 * o início e o callback de um fluxo OAuth (ver
 * modules/google-calendar/infra/http/controllers/) sem precisar de uma
 * tabela ou Redis dedicados só a "state". Funções puras: o secret é sempre
 * recebido por parâmetro (normalmente env.BETTER_AUTH_SECRET), mesmo
 * racional de token-cipher.ts — nenhuma variável de ambiente é lida aqui.
 */

export function signState(
  payload: Record<string, string>,
  secret: string,
  ttlMs: number,
): string {
  const body = { ...payload, exp: Date.now() + ttlMs };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');

  return `${encoded}.${signature}`;
}

/**
 * Lança um Error genérico se o state for malformado, tiver assinatura
 * inválida ou estiver expirado. Sem `extends Record<string, string>` no
 * genérico de propósito: interfaces nomeadas (ex: o shape real que o
 * chamador espera de volta) não satisfazem esse tipo de índice em TS
 * mesmo tendo só campos string — o corpo decodificado já é `unknown` no
 * fim das contas (vem de JSON.parse), então o cast fica a cargo de quem
 * chama.
 */
export function verifyState<T>(token: string, secret: string): T {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    throw new Error('Formato de state inválido.');
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Assinatura do state inválida.');
  }

  const body = JSON.parse(
    Buffer.from(encoded, 'base64url').toString('utf8'),
  ) as T & { exp: number };

  if (body.exp < Date.now()) {
    throw new Error('State expirado.');
  }

  return body;
}
