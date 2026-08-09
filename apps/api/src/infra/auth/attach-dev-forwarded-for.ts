import type { NextFunction, Request, Response } from 'express';

/**
 * O rate limit do better-auth só enxerga IP de cliente via header
 * x-forwarded-for (getIp() em better-auth/dist/utils/get-request-ip.mjs
 * nunca lê o socket TCP direto). Sem reverse proxy na frente da API (nosso
 * caso em dev/staging local), esse header nunca chega, e o better-auth cai
 * num IP fixo (127.0.0.1) para qualquer origem — testar o rate limit a
 * partir de dispositivos diferentes na mesma rede (ex: celular via IP da
 * LAN) cairia tudo no mesmo balde.
 *
 * Preenche x-forwarded-for com o IP real da conexão TCP só quando o header
 * ainda não existir, para não sobrepor um valor de teste setado manualmente
 * (curl/Postman) nem, futuramente em produção, um valor real de proxy.
 */
// Endereços "não especificados": nunca identificam um cliente de verdade.
// Se remoteAddress vier assim (ex: relay/proxy de rede "lavando" a origem
// antes de chegar no processo Node), é melhor não setar o header e deixar o
// fallback do próprio better-auth (127.0.0.1 fixo em dev) do que gravar um
// valor sem sentido no rateLimit.
const UNSPECIFIED_ADDRESSES = new Set(['::', '0.0.0.0', '::ffff:0.0.0.0']);

export function attachDevForwardedFor(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const remoteAddress = req.socket.remoteAddress;
  if (
    !req.headers['x-forwarded-for'] &&
    remoteAddress &&
    !UNSPECIFIED_ADDRESSES.has(remoteAddress)
  ) {
    req.headers['x-forwarded-for'] = remoteAddress;
  }
  next();
}
