require('./setup');
const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');

async function createUser(role) {
  const user = await User.create({
    name: role === 'admin' ? 'Ava Admin' : 'Max Member',
    email: `${role}@test.dev`,
    password: 'password123',
    role,
  });
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'password123' });
  return { user, token: res.body.token };
}

describe('auth rules', () => {
  test('protected route rejects requests with no token', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });

  test('protected route rejects an invalid token', async () => {
    const res = await request(app).get('/api/leads').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  test('login rejects wrong password', async () => {
    await User.create({ name: 'Ava', email: 'ava@test.dev', password: 'correct-password', role: 'admin' });
    const res = await request(app).post('/api/auth/login').send({ email: 'ava@test.dev', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('login succeeds and returns a usable token', async () => {
    await User.create({ name: 'Ava', email: 'ava2@test.dev', password: 'correct-password', role: 'admin' });
    const res = await request(app).post('/api/auth/login').send({ email: 'ava2@test.dev', password: 'correct-password' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('admin');
  });

  test('member is forbidden from admin-only user management', async () => {
    const { token } = await createUser('member');
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Person', email: 'new@test.dev', password: 'password123' });
    expect(res.status).toBe(403);
  });

  test('admin can create a new user', async () => {
    const { token } = await createUser('admin');
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Person', email: 'new@test.dev', password: 'password123', role: 'member' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('new@test.dev');
  });

  test('member is forbidden from deleting a lead; admin is allowed', async () => {
    const { token: memberToken } = await createUser('member');
    const { token: adminToken } = await createUser('admin');

    const create = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Del Test', email: 'del@test.dev' });
    const leadId = create.body.id;

    const forbidden = await request(app).delete(`/api/leads/${leadId}`).set('Authorization', `Bearer ${memberToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app).delete(`/api/leads/${leadId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(204);
  });
});

module.exports = { createUser };
