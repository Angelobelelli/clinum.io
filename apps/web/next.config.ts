import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aponta para a raiz do monorepo: node_modules do pnpm workspace ficam
  // hoisted lá (via symlink), então o Turbopack precisa desse escopo para
  // resolver pacotes como "next" a partir de apps/web.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  // Necessário para o build Docker (apps/web/Dockerfile): gera um bundle
  // standalone com só os arquivos/dependências realmente usados.
  output: "standalone",
};

export default nextConfig;
