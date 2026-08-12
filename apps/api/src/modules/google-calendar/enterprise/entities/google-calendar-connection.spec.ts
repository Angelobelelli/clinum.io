import { GoogleCalendarConnection } from '@/modules/google-calendar/enterprise/entities/google-calendar-connection';

describe('GoogleCalendarConnection', () => {
  it('cria com calendarId default e sem canal de watch', () => {
    const connection = GoogleCalendarConnection.create({
      organizationId: 'org-1',
      memberId: 'member-1',
      googleAccountEmail: 'staff@example.com',
      refreshToken: 'refresh-token',
      calendarId: 'primary',
    });

    expect(connection.calendarId).toBe('primary');
    expect(connection.watchChannelId).toBeUndefined();
  });

  it('reautorizar troca refreshToken e googleAccountEmail', () => {
    const connection = GoogleCalendarConnection.create({
      organizationId: 'org-1',
      memberId: 'member-1',
      googleAccountEmail: 'antigo@example.com',
      refreshToken: 'token-antigo',
      calendarId: 'primary',
    });

    connection.reautorizar({
      refreshToken: 'token-novo',
      googleAccountEmail: 'novo@example.com',
    });

    expect(connection.refreshToken).toBe('token-novo');
    expect(connection.googleAccountEmail).toBe('novo@example.com');
  });

  it('registrarCanalWatch grava os 4 campos do canal', () => {
    const connection = GoogleCalendarConnection.create({
      organizationId: 'org-1',
      memberId: 'member-1',
      googleAccountEmail: 'staff@example.com',
      refreshToken: 'refresh-token',
      calendarId: 'primary',
    });
    const expiresAt = new Date('2026-10-01T00:00:00.000Z');

    connection.registrarCanalWatch({
      channelId: 'channel-1',
      channelToken: 'token-1',
      resourceId: 'resource-1',
      expiresAt,
    });

    expect(connection.watchChannelId).toBe('channel-1');
    expect(connection.watchChannelToken).toBe('token-1');
    expect(connection.watchResourceId).toBe('resource-1');
    expect(connection.watchExpiresAt).toEqual(expiresAt);
  });

  it('atualizarSyncToken aceita undefined (limpa o token)', () => {
    const connection = GoogleCalendarConnection.create({
      organizationId: 'org-1',
      memberId: 'member-1',
      googleAccountEmail: 'staff@example.com',
      refreshToken: 'refresh-token',
      calendarId: 'primary',
      syncToken: 'token-antigo',
    });

    connection.atualizarSyncToken(undefined);

    expect(connection.syncToken).toBeNull();
  });
});
