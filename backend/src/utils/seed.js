require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Lead = require('../models/Lead');
const { connectDB } = require('../config/db');

async function seed() {
  await connectDB(process.env.MONGO_URI);

  await Promise.all([User.deleteMany({}), Lead.deleteMany({})]);

  const admin = await User.create({
    name: 'Ava Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@leadflow.dev',
    password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
    role: 'admin',
  });

  const member = await User.create({
    name: 'Max Member',
    email: process.env.SEED_MEMBER_EMAIL || 'member@leadflow.dev',
    password: process.env.SEED_MEMBER_PASSWORD || 'ChangeMe123!',
    role: 'member',
  });

  await Lead.create([
    {
      name: 'Priya Shah',
      email: 'priya@northwind-retail.com',
      company: 'Northwind Retail',
      phone: '+1 415 555 0110',
      message: 'Interested in a Shopify rebuild for 4 stores.',
      status: 'new',
      activity: [{ action: 'created', meta: { source: 'seed' } }],
    },
    {
      name: 'Tom Whitfield',
      email: 'tom@brightpath.co.uk',
      company: 'Brightpath Consulting',
      status: 'contacted',
      assignedTo: member._id,
      notes: [{ text: 'Left a voicemail, following up Thursday.', author: member._id }],
      activity: [
        { action: 'created', meta: { source: 'seed' } },
        { action: 'assigned', actor: admin._id, meta: { to: member._id.toString() } },
      ],
    },
  ]);

  console.log('Seeded users:');
  console.log(`  admin  -> ${admin.email} / ${process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'}`);
  console.log(`  member -> ${member.email} / ${process.env.SEED_MEMBER_PASSWORD || 'ChangeMe123!'}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
