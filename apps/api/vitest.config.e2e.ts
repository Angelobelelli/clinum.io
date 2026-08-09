import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Config dos testes e2e (test/**\/*.e2e-spec.ts) — sobem a aplicação Nest
 * inteira via Test.createTestingModule e batem no Postgres real. Ver
 * vitest.config.ts para o porquê do plugin swc.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
    // NODE_ENV=test desliga o rate limit do better-auth (ver auth.ts) sem
    // desligar o override de tenant via X-Tenant-Slug (ver
    // tenant.middleware.ts, que permite esse header fora de produção).
    env: { NODE_ENV: 'test' },
  },
});
