import { signState, verifyState } from '@/core/crypto/signed-state';

const SECRET = 'test-secret';

interface StatePayload {
  organizationId: string;
  memberId: string;
}

describe('signed-state', () => {
  it('faz o round-trip sign/verify corretamente', () => {
    const token = signState(
      { organizationId: 'org-1', memberId: 'member-1' },
      SECRET,
      10_000,
    );

    const payload = verifyState<StatePayload>(token, SECRET);

    expect(payload.organizationId).toBe('org-1');
    expect(payload.memberId).toBe('member-1');
  });

  it('lança quando a assinatura não bate (secret errado)', () => {
    const token = signState({ organizationId: 'org-1' }, SECRET, 10_000);

    expect(() => verifyState(token, 'outro-secret')).toThrow();
  });

  it('lança quando o token está expirado', () => {
    const token = signState({ organizationId: 'org-1' }, SECRET, -1);

    expect(() => verifyState(token, SECRET)).toThrow();
  });

  it('lança para um token malformado', () => {
    expect(() => verifyState('token-sem-ponto', SECRET)).toThrow();
  });
});
