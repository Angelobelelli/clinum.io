import { decryptToken, encryptToken } from '@/core/crypto/token-cipher';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');
const OTHER_KEY = Buffer.alloc(32, 9).toString('base64');

describe('token-cipher', () => {
  it('faz o round-trip encrypt/decrypt corretamente', () => {
    const plaintext = '1//0gA3xyz-refresh-token-do-google';

    const encrypted = encryptToken(plaintext, TEST_KEY);
    const decrypted = decryptToken(encrypted, TEST_KEY);

    expect(decrypted).toBe(plaintext);
  });

  it('gera um resultado diferente a cada chamada (IV aleatório)', () => {
    const plaintext = 'mesmo-token';

    const first = encryptToken(plaintext, TEST_KEY);
    const second = encryptToken(plaintext, TEST_KEY);

    expect(first).not.toBe(second);
    expect(decryptToken(first, TEST_KEY)).toBe(plaintext);
    expect(decryptToken(second, TEST_KEY)).toBe(plaintext);
  });

  it('lança ao decriptar com a chave errada (authTag não bate)', () => {
    const encrypted = encryptToken('token-secreto', TEST_KEY);

    expect(() => decryptToken(encrypted, OTHER_KEY)).toThrow();
  });

  it('lança ao decriptar um payload adulterado', () => {
    const encrypted = encryptToken('token-secreto', TEST_KEY);
    const tampered = encrypted.slice(0, -4) + 'aaaa';

    expect(() => decryptToken(tampered, TEST_KEY)).toThrow();
  });

  it('lança para uma chave que não tem 32 bytes em base64', () => {
    const shortKey = Buffer.alloc(16, 1).toString('base64');

    expect(() => encryptToken('x', shortKey)).toThrow();
  });

  it('lança para um payload com prefixo de versão desconhecido', () => {
    expect(() => decryptToken('v2:abcd', TEST_KEY)).toThrow();
  });
});
