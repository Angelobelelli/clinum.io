import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Config dos testes unitários (src/**\/*.spec.ts). swc é necessário porque o
 * Nest depende de emitDecoratorMetadata (reflect-metadata) pra resolver
 * injeção de dependência — o esbuild padrão do Vite não emite isso. O
 * plugin lê tsconfig.json automaticamente (experimentalDecorators +
 * emitDecoratorMetadata já configurados lá).
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,js}'],
    },
  },
});
