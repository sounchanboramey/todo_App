import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { Reflector } from '@nestjs/core';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
const { RolesGuard } = await import('../dist/auth/roles.guard.js');
const { JwtAuthGuard } = await import('../dist/auth/jwt-auth.guard.js');
const { UsersController } = await import('../dist/users/users.controller.js');
const { AuthController } = await import('../dist/auth/auth.controller.js');
const { TodosController } = await import('../dist/todos/todos.controller.js');
const { TodosService } = await import('../dist/todos/todos.service.js');
const { UsersService } = await import('../dist/users/users.service.js');
const { IS_PUBLIC } =
  await import('../dist/auth/decorators/public.decorator.js');
const context = (controller, method, user) => ({
  getClass: () => controller,
  getHandler: () => controller.prototype[method],
  switchToHttp: () => ({ getRequest: () => ({ user }) }),
});

test('admin management routes deny ordinary users and missing identities', () => {
  const guard = new RolesGuard(new Reflector());
  for (const method of ['findAll', 'findOne', 'create', 'update', 'remove']) {
    assert.equal(
      guard.canActivate(context(UsersController, method, { role: 'USER' })),
      false,
    );
    assert.equal(guard.canActivate(context(UsersController, method)), false);
    assert.equal(
      guard.canActivate(context(UsersController, method, { role: 'ADMIN' })),
      true,
    );
  }
  assert.equal(
    guard.canActivate(context(TodosController, 'findAll', { role: 'USER' })),
    true,
  );
  const reflector = new Reflector();
  assert.equal(
    reflector.getAllAndOverride(IS_PUBLIC, [
      AuthController.prototype.logout,
      AuthController,
    ]),
    undefined,
  );
  const jwtGuard = new JwtAuthGuard(reflector);
  assert.equal(jwtGuard.canActivate(context(AuthController, 'refresh')), true);
});

test('owners can manage their todos; another user cannot see or change them', async () => {
  const rows = new Map();
  let id = 0;
  const repo = {
    find: async ({ where }) =>
      [...rows.values()].filter((row) => row.ownerId === where.ownerId),
    findOneBy: async ({ id, ownerId }) =>
      rows.get(id)?.ownerId === ownerId ? { ...rows.get(id) } : null,
    create: (data) => ({ ...data }),
    save: async (row) => {
      const saved = { ...row, id: row.id ?? ++id };
      rows.set(saved.id, saved);
      return saved;
    },
    remove: async (row) => rows.delete(row.id),
  };
  const service = new TodosService(repo);
  const controller = new TodosController(service);
  const owner = { id: 1 },
    other = { id: 2 };
  const todo = await controller.create(
    { title: 'Private task', ownerId: 2 },
    owner,
  );
  assert.equal(todo.ownerId, 1);
  assert.deepEqual(await controller.findAll(other), []);
  assert.equal((await controller.findAll(owner)).length, 1);
  const missing = (error) => error.getStatus?.() === 404;
  await assert.rejects(controller.findOne(todo.id, other), missing);
  await assert.rejects(
    controller.update(todo.id, { title: 'Stolen' }, other),
    missing,
  );
  await assert.rejects(controller.remove(todo.id, other), missing);
  const updated = await controller.update(
    todo.id,
    { title: 'Edited', ownerId: 2 },
    owner,
  );
  assert.equal(updated.ownerId, 1);
  assert.equal(updated.title, 'Edited');
  await controller.remove(todo.id, owner);
  assert.deepEqual(await controller.findAll(owner), []);
});

test('signup cannot assign an admin role or expose a password hash', async () => {
  const repo = {
    create: (data) => ({ role: 'USER', ...data }),
    save: async (row) => ({ id: 1, ...row }),
  };
  const users = new UsersService(repo);
  const result = await users.create({
    username: 'new',
    email: 'NEW@example.com',
    password: 'MyPassword123!',
    role: 'ADMIN',
  });
  assert.equal(result.role, 'USER');
  assert.equal(result.email, 'new@example.com');
  assert.equal(result.passwordHash, undefined);
});
