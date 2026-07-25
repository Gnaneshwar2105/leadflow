require('./setup');
const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');

async function login(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('core flow 1: public capture -> visible to admin, invisible-to-others-until-assigned logic', () => {
  test('a public submission creates a "new" lead that shows up for admins', async () => {
    const admin = await User.create({ name: 'Ava', email: 'ava@test.dev', password: 'password123', role: 'admin' });
    const adminToken = await login(admin.email, 'password123');

    const submit = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Jordan Lee', email: 'jordan@acme.com', company: 'Acme Co', message: 'Need a rebuild' });
    expect(submit.status).toBe(201);

    const list = await request(app).get('/api/leads').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].status).toBe('new');
    expect(list.body.items[0].email).toBe('jordan@acme.com');
  });

  test('public endpoint cannot set status, assignment, or notes directly', async () => {
    const submit = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Hacky', email: 'hacky@test.dev', status: 'converted', assignedTo: 'irrelevant' });
    expect(submit.status).toBe(201);

    const lead = await Lead.findOne({ email: 'hacky@test.dev' });
    expect(lead.status).toBe('new');
    expect(lead.assignedTo).toBeNull();
  });
});

describe('core flow 2: member works an assigned lead end to end', () => {
  test('member updates status and adds a note on their own assigned lead, recorded in activity', async () => {
    const admin = await User.create({ name: 'Ava', email: 'ava3@test.dev', password: 'password123', role: 'admin' });
    const member = await User.create({ name: 'Max', email: 'max3@test.dev', password: 'password123', role: 'member' });
    const adminToken = await login(admin.email, 'password123');
    const memberToken = await login(member.email, 'password123');

    const lead = await Lead.create({ name: 'Sam Prospect', email: 'sam@test.dev' });

    // admin assigns the lead to the member
    const assign = await request(app)
      .patch(`/api/leads/${lead._id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: member._id.toString() });
    expect(assign.status).toBe(200);
    expect(assign.body.lead.assignedTo._id).toBe(member._id.toString());

    // member updates status
    const statusRes = await request(app)
      .patch(`/api/leads/${lead._id}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'contacted' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.lead.status).toBe('contacted');

    // member adds a note
    const noteRes = await request(app)
      .post(`/api/leads/${lead._id}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ text: 'Called, left voicemail' });
    expect(noteRes.status).toBe(201);
    expect(noteRes.body.lead.notes).toHaveLength(1);

    // activity trail recorded all three actions
    const detail = await request(app).get(`/api/leads/${lead._id}`).set('Authorization', `Bearer ${memberToken}`);
    const actions = detail.body.lead.activity.map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['assigned', 'status_changed', 'note_added']));
  });

  test('a member cannot see or modify a lead assigned to someone else', async () => {
    const memberA = await User.create({ name: 'A', email: 'a@test.dev', password: 'password123', role: 'member' });
    const memberB = await User.create({ name: 'B', email: 'b@test.dev', password: 'password123', role: 'member' });
    const tokenB = await login(memberB.email, 'password123');

    const lead = await Lead.create({ name: 'Owned by A', email: 'ownedbya@test.dev', assignedTo: memberA._id });

    const view = await request(app).get(`/api/leads/${lead._id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(view.status).toBe(403);

    const note = await request(app)
      .post(`/api/leads/${lead._id}/notes`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ text: 'trying anyway' });
    expect(note.status).toBe(403);
  });

  test('pagination and status filtering work', async () => {
    const admin = await User.create({ name: 'Ava', email: 'ava4@test.dev', password: 'password123', role: 'admin' });
    const adminToken = await login(admin.email, 'password123');

    const docs = Array.from({ length: 25 }).map((_, i) => ({
      name: `Lead ${i}`,
      email: `lead${i}@test.dev`,
      status: i % 5 === 0 ? 'qualified' : 'new',
    }));
    await Lead.insertMany(docs);

    const page1 = await request(app).get('/api/leads?page=1&limit=10').set('Authorization', `Bearer ${adminToken}`);
    expect(page1.body.items).toHaveLength(10);
    expect(page1.body.totalPages).toBe(3);

    const filtered = await request(app)
      .get('/api/leads?status=qualified')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filtered.body.total).toBe(5);
  });
});
