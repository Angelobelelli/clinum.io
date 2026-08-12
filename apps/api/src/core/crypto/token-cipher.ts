import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Criptografia simétrica de tokens (ex: refresh token OAuth do Google, ver
 * modules/google-calendar/) para armazenamento em repouso — nunca em texto
 * puro no banco.
 *
 * Funções puras (sem @Injectable(), sem ler `env` diretamente) — a chave é
 * sempre recebida por parâmetro, resolvida pelo chamador (normalmente
 * `env.GOOGLE_TOKEN_ENCRYPTION_KEY`, ver core/env/env.ts). Isso mantém este
 * módulo testável sem precisar de nenhuma variável de ambiente configurada,
 * como o resto de core/.
 *
 * Algoritmo: AES-256-GCM. Formato de armazenamento: um prefixo de versão
 * ("v1:") seguido do base64 de iv(12) + authTag(16) + ciphertext — o
 * prefixo permite trocar de algoritmo no futuro sem quebrar dados já
 * gravados. Um IV aleatório por chamada garante que duas criptografias do
 * mesmo texto nunca produzam o mesmo resultado.
 */

const ALGORITHM = 'aes-256-gcm';
const VERSION_PREFIX = 'v1:';
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;

function decodeKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `Chave de criptografia inválida: esperados ${KEY_LENGTH_BYTES} bytes em base64, recebidos ${key.length}.`,
    );
  }
  return key;
}

export function encryptToken(plaintext: string, keyBase64: string): string {
  const key = decodeKey(keyBase64);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return (
    VERSION_PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString('base64')
  );
}

export function decryptToken(payload: string, keyBase64: string): string {
  if (!payload.startsWith(VERSION_PREFIX)) {
    throw new Error('Payload de token criptografado com versão desconhecida.');
  }
  const key = decodeKey(keyBase64);
  const raw = Buffer.from(payload.slice(VERSION_PREFIX.length), 'base64');

  const iv = raw.subarray(0, IV_LENGTH_BYTES);
  const authTag = raw.subarray(
    IV_LENGTH_BYTES,
    IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES,
  );
  const ciphertext = raw.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
