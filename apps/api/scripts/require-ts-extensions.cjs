'use strict';

const Module = require('node:module');

const originalResolveFilename = Module._resolveFilename;

/**
 * O client TS gerado pelo Prisma 7 (generator "prisma-client", ver
 * prisma/schema.prisma) usa imports relativos com extensão ".js" (estilo
 * ESM/nodenext), ex: require('./internal/class.js'). Isso resolve
 * normalmente quando o código passa por um build real (tsc via
 * `nest build`/`nest start`, que emite arquivos .js de verdade nesses
 * caminhos) ou via ts-jest (que já remapeia isso, ver moduleNameMapper em
 * test/jest-e2e.json). Rodando um script avulso via `ts-node` puro (sem
 * build prévio), esse arquivo .js nunca existe de fato — só o .ts.
 *
 * Este shim faz exatamente o que o moduleNameMapper do Jest já faz: se a
 * resolução original falhar para um specifier relativo terminado em ".js",
 * tenta de novo sem a extensão (deixando o require hook do ts-node/register
 * resolver o .ts correspondente).
 */
Module._resolveFilename = function patchedResolveFilename(request, ...rest) {
  try {
    return originalResolveFilename.call(this, request, ...rest);
  } catch (error) {
    if (/^\.\.?[\\/]/.test(request) && request.endsWith('.js')) {
      return originalResolveFilename.call(this, request.slice(0, -3), ...rest);
    }
    throw error;
  }
};
