import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import type { User } from './users.repository';

function makeRepos() {
  const users = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };
  const sessions = {
    create: jest.fn().mockResolvedValue('session-id'),
    findValidByHash: jest.fn(),
    revoke: jest.fn(),
  };
  return { users, sessions };
}

function makeService(repos: ReturnType<typeof makeRepos>) {
  const jwt = new JwtService({ secret: 'test-secret' });
  return new AuthService(repos.users as never, repos.sessions as never, jwt);
}

describe('AuthService', () => {
  it('hashes the password on register (never stores plaintext)', async () => {
    const repos = makeRepos();
    repos.users.findByEmail.mockResolvedValue(undefined);
    repos.users.create.mockImplementation(
      (email: string, passwordHash: string, name: string): User => ({
        id: 'u1',
        email,
        name,
        passwordHash,
        role: 'user',
        createdAt: new Date(),
      }),
    );
    const service = makeService(repos);

    await service.register('a@example.com', 'correct-horse-battery', 'Ada');

    const [, storedHash] = repos.users.create.mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(storedHash).not.toBe('correct-horse-battery');
    expect(await bcrypt.compare('correct-horse-battery', storedHash)).toBe(
      true,
    );
  });

  it('rejects registering an email that already exists', async () => {
    const repos = makeRepos();
    repos.users.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      name: 'Ada',
      passwordHash: 'x',
      createdAt: new Date(),
    });
    const service = makeService(repos);

    await expect(
      service.register('a@example.com', 'correct-horse-battery', 'Ada'),
    ).rejects.toThrow();
  });

  it('login issues a verifiable JWT access token on success', async () => {
    const repos = makeRepos();
    const passwordHash = await bcrypt.hash('correct-horse-battery', 12);
    repos.users.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      passwordHash,
      createdAt: new Date(),
    });
    const service = makeService(repos);

    const tokens = await service.login(
      'a@example.com',
      'correct-horse-battery',
    );
    expect(tokens.userId).toBe('u1');

    const jwt = new JwtService({ secret: 'test-secret' });
    const decoded = await jwt.verifyAsync<{ sub: string }>(tokens.accessToken);
    expect(decoded.sub).toBe('u1');
  });

  it('gives the same generic error for an unknown email and a wrong password (no account enumeration)', async () => {
    const repos = makeRepos();
    const passwordHash = await bcrypt.hash('correct-horse-battery', 12);
    const service = makeService(repos);

    repos.users.findByEmail.mockResolvedValue(undefined);
    let unknownEmailError: unknown;
    try {
      await service.login('nobody@example.com', 'anything');
    } catch (error) {
      unknownEmailError = error;
    }

    repos.users.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      passwordHash,
      createdAt: new Date(),
    });
    let wrongPasswordError: unknown;
    try {
      await service.login('a@example.com', 'wrong-password');
    } catch (error) {
      wrongPasswordError = error;
    }

    expect((unknownEmailError as Error).message).toBe(
      (wrongPasswordError as Error).message,
    );
  });

  it('logout revokes the session so the refresh token can no longer be used', async () => {
    const repos = makeRepos();
    repos.sessions.findValidByHash.mockResolvedValue({
      id: 'session-1',
      userId: 'u1',
    });
    const service = makeService(repos);

    await service.logout('some-refresh-token');

    expect(repos.sessions.revoke).toHaveBeenCalledWith('session-1');
  });

  it('logout with an already-invalid token is a no-op, not an error', async () => {
    const repos = makeRepos();
    repos.sessions.findValidByHash.mockResolvedValue(undefined);
    const service = makeService(repos);

    await expect(service.logout('bogus-token')).resolves.toBeUndefined();
    expect(repos.sessions.revoke).not.toHaveBeenCalled();
  });

  it('refresh rejects an expired/unknown token', async () => {
    const repos = makeRepos();
    repos.sessions.findValidByHash.mockResolvedValue(undefined);
    const service = makeService(repos);

    await expect(service.refresh('bogus-token')).rejects.toThrow();
  });

  it('refresh rotates the session (old refresh token is revoked, single-use)', async () => {
    const repos = makeRepos();
    repos.sessions.findValidByHash.mockResolvedValue({
      id: 'session-1',
      userId: 'u1',
    });
    const service = makeService(repos);

    await service.refresh('valid-refresh-token');

    expect(repos.sessions.revoke).toHaveBeenCalledWith('session-1');
    expect(repos.sessions.create).toHaveBeenCalled();
  });
});
