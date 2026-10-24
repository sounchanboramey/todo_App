import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import * as argon2 from 'argon2';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
const { AuthService } = await import('../dist/auth/auth.service.js');
const { AuthController } = await import('../dist/auth/auth.controller.js');
const { JwtStrategy } = await import('../dist/auth/jwt.strategy.js');
const { JwtAuthGuard } = await import('../dist/auth/jwt-auth.guard.js');
const { authConfig } = await import('../dist/auth/auth.config.js');
const jwt = new JwtService({
  secret: authConfig.accessSecret,
  signOptions: { algorithm: 'HS256', expiresIn: 900 },
});
const user = {
  id: 1,
  username: 'mey',
  email: 'mey@example.com',
  role: 'USER',
  passwordHash: await argon2.hash('MyPassword123!'),
};
function setup() {
  const sessions = new Map();
  const users = {
    findOne: async () => user,
    findOneBy: async ({ id }) => (id === user.id ? user : null),
  };
  const repo = {
    create: (data) => ({ ...data }),
    save: async (data) => {
      sessions.set(data.id, data);
      return data;
    },
    findOne: async ({ where }) => {
      const row = sessions.get(where.id);
      return row?.userId === where.userId ? row : null;
    },
    delete: async ({ id, tokenHash, userId }) => {
      if (userId !== undefined) {
        let affected = 0;
        for (const [key, row] of sessions)
          if (row.userId === userId) {
            sessions.delete(key);
            affected++;
          }
        return { affected };
      }
      const row = sessions.get(id);
      if (row?.tokenHash !== tokenHash) return { affected: 0 };
      sessions.delete(id);
      return { affected: 1 };
    },
  };
  const res = {
    cookie(name, value, options) {
      this.value = value;
      this.options = options;
    },
    clearCookie(name, options) {
      this.cleared = true;
      this.clearOptions = options;
    },
  };
  return {
    service: new AuthService(users, {}, repo, jwt),
    sessions,
    res,
    users,
  };
}
const unauthorized = (error) => error.getStatus?.() === 401;
test('login, rotation, replay rejection, logout and cookie flags', async () => {
  const { service, res, sessions } = setup();
  const result = await service.login(
    { email: user.email, password: 'MyPassword123!' },
    res,
  );
  assert.deepEqual(Object.keys(result), ['accessToken']);
  const access = await jwt.verifyAsync(result.accessToken);
  assert.equal(access.type, 'access');
  assert.equal(access.exp - access.iat, 900);
  const first = res.value;
  const refresh = await jwt.verifyAsync(first, {
    secret: authConfig.refreshSecret,
  });
  assert.equal(refresh.type, 'refresh');
  assert.equal(res.options.httpOnly, true);
  assert.equal(res.options.path, '/api/auth');
  assert.equal(res.options.sameSite, 'strict');
  assert.notEqual(sessions.get(refresh.jti).tokenHash, first);
  await service.refresh(first, res);
  assert.notEqual(res.value, first);
  await assert.rejects(service.refresh(first, res), unauthorized);
  await service.logout(user.id, res);
  assert.equal(res.cleared, true);
  assert.equal(res.clearOptions.path, res.options.path);
  await assert.rejects(service.refresh(res.value, res), unauthorized);
  await service.logout(user.id, res);
});
test('missing, tampered, expired and wrong token types are rejected', async () => {
  const { service, res, sessions } = setup();
  await assert.rejects(
    service.login({ email: user.email, password: 'wrong' }, res),
    unauthorized,
  );
  await assert.rejects(service.refresh(undefined, res), unauthorized);
  const access = await service.issueTokens(user, res);
  await assert.rejects(service.refresh(access.accessToken, res), unauthorized);
  await assert.rejects(service.refresh(res.value + 'x', res), unauthorized);
  const expired = await jwt.signAsync(
    { sub: 1, type: 'refresh', jti: '00000000-0000-0000-0000-000000000000' },
    { secret: authConfig.refreshSecret, expiresIn: -1 },
  );
  await assert.rejects(service.refresh(expired, res), unauthorized);
  for (const row of sessions.values()) row.expiresAt = new Date(0);
  await assert.rejects(service.refresh(res.value, res), unauthorized);
});
test('only one concurrent refresh can consume a session', async () => {
  const { service, res } = setup();
  await service.issueTokens(user, res);
  const token = res.value;
  const results = await Promise.allSettled([
    service.refresh(token, res),
    service.refresh(token, res),
  ]);
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
});
test('strategy rejects refresh payloads and deleted users; public routes bypass guard', async () => {
  const { users } = setup();
  const strategy = new JwtStrategy(users);
  assert.deepEqual(await strategy.validate({ sub: 1, type: 'access' }), {
    id: 1,
    username: user.username,
    email: user.email,
    role: 'USER',
  });
  await assert.rejects(
    strategy.validate({ sub: 1, type: 'refresh' }),
    unauthorized,
  );
  await assert.rejects(
    strategy.validate({ sub: 99, type: 'access' }),
    unauthorized,
  );
  const guard = new JwtAuthGuard(new Reflector());
  assert.equal(
    guard.canActivate({
      getHandler: () => AuthController.prototype.login,
      getClass: () => AuthController,
    }),
    true,
  );
  const controller = new AuthController({});
  assert.throws(
    () =>
      controller.refresh({ headers: { origin: 'https://evil.example' } }, {}),
    (error) => error.getStatus() === 403,
  );
});

test('logout revokes every session for this user and preserves other users', async () => {
  const { service, res, sessions } = setup();
  await service.issueTokens(user, res);
  const first = res.value;
  await service.issueTokens(user, res);
  const second = res.value;
  await service.issueTokens({ ...user, id: 2 }, res);
  await service.logout(user.id, res);
  assert.equal(sessions.size, 1);
  assert.equal([...sessions.values()][0].userId, 2);
  await assert.rejects(service.refresh(first, res), unauthorized);
  await assert.rejects(service.refresh(second, res), unauthorized);
});
