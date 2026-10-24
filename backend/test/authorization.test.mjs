import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
const { AuthModule } = await import('../dist/auth/auth.module.js');
const { User } = await import('../dist/users/entities/user.entity.js');
const { RefreshToken } =
  await import('../dist/auth/entities/refresh-token.entity.js');
const { Todo } = await import('../dist/todos/entities/todo.entity.js');
const { TodosController } = await import('../dist/todos/todos.controller.js');
const { TodosService } = await import('../dist/todos/todos.service.js');
const { UsersController } = await import('../dist/users/users.controller.js');
const { UsersService } = await import('../dist/users/users.service.js');

test('HTTP guards, owner isolation, protected logout and safe signup', async () => {
  const accounts = new Map([
    [1, { id: 1, username: 'one', email: 'one@example.com', role: 'USER' }],
    [2, { id: 2, username: 'two', email: 'two@example.com', role: 'USER' }],
    [
      3,
      { id: 3, username: 'admin', email: 'admin@example.com', role: 'ADMIN' },
    ],
  ]);
  const usersRepo = {
    findOneBy: async ({ id }) => accounts.get(id),
    create: (data) => ({ role: 'USER', ...data }),
    save: async (data) => ({ id: 4, ...data }),
  };
  let nextId = 1;
  const rows = new Map();
  const todosRepo = {
    find: async ({ where }) =>
      [...rows.values()].filter((row) => row.ownerId === where.ownerId),
    findOneBy: async ({ id, ownerId }) =>
      rows.get(id)?.ownerId === ownerId ? { ...rows.get(id) } : null,
    create: (data) => ({ ...data }),
    save: async (row) => {
      const saved = { ...row, id: row.id ?? nextId++ };
      rows.set(saved.id, saved);
      return saved;
    },
    remove: async (row) => {
      rows.delete(row.id);
    },
  };
  let revokedUser;
  const module = await Test.createTestingModule({
    imports: [AuthModule],
    controllers: [TodosController, UsersController],
    providers: [
      TodosService,
      { provide: getRepositoryToken(Todo), useValue: todosRepo },
      {
        provide: UsersService,
        useValue: { findAll: async () => [...accounts.values()] },
      },
    ],
  })
    .overrideProvider(getRepositoryToken(User))
    .useValue(usersRepo)
    .overrideProvider(getRepositoryToken(RefreshToken))
    .useValue({
      delete: async ({ userId }) => {
        revokedUser = userId;
      },
    })
    .compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  try {
    const api = request(app.getHttpServer());
    const jwt = module.get(JwtService);
    const bearer = async (id, opts) =>
      `Bearer ${await jwt.signAsync({ sub: id, type: 'access' }, opts)}`;
    const one = await bearer(1),
      two = await bearer(2),
      admin = await bearer(3);
    await api.get('/api/todos').expect(401);
    await api
      .get('/api/todos')
      .set('Authorization', 'Bearer garbage')
      .expect(401);
    await api
      .get('/api/todos')
      .set('Authorization', await bearer(1, { expiresIn: -1 }))
      .expect(401);
    const signup = await api
      .post('/api/auth/signup')
      .send({
        username: 'new',
        email: 'new@example.com',
        password: 'MyPassword123!',
        role: 'ADMIN',
      })
      .expect(201);
    assert.equal(signup.body.role, 'USER');
    assert.equal(signup.body.passwordHash, undefined);
    await api.get('/api/users').set('Authorization', one).expect(403);
    await api.get('/api/users').set('Authorization', admin).expect(200);
    const me = await api
      .get('/api/auth/me')
      .set('Authorization', one)
      .expect(200);
    assert.equal(me.body.id, 1);
    assert.equal(me.body.role, 'USER');
    const created = await api
      .post('/api/todos')
      .set('Authorization', one)
      .send({ title: 'Private task', ownerId: 2 })
      .expect(201);
    const id = created.body.id;
    assert.equal(created.body.ownerId, 1);
    const otherList = await api
      .get('/api/todos')
      .set('Authorization', two)
      .expect(200);
    assert.deepEqual(otherList.body, []);
    for (const method of ['get', 'patch', 'delete']) {
      const req = api[method](`/api/todos/${id}`).set('Authorization', two);
      if (method === 'patch') req.send({ title: 'Stolen' });
      await req.expect(404);
    }
    const updated = await api
      .patch(`/api/todos/${id}`)
      .set('Authorization', one)
      .send({ title: 'Updated', ownerId: 2 })
      .expect(200);
    assert.equal(updated.body.ownerId, 1);
    await api.get(`/api/todos/${id}`).set('Authorization', one).expect(200);
    await api.delete(`/api/todos/${id}`).set('Authorization', one).expect(204);
    await api.post('/api/auth/logout').expect(401);
    const logout = await api
      .post('/api/auth/logout')
      .set('Authorization', one)
      .expect(204);
    assert.equal(revokedUser, 1);
    assert.ok(
      logout.headers['set-cookie'].some(
        (cookie) =>
          cookie.includes('refresh_token=;') &&
          cookie.includes('Path=/api/auth'),
      ),
    );
  } finally {
    await app.close();
  }
});
