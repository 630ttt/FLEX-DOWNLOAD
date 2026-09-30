require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Yamini@123';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/yamini_flex_printing');

  const existing = await Admin.findOne({ username: ADMIN_USERNAME.toLowerCase() });
  if (existing) {
    console.log(`Admin "${ADMIN_USERNAME}" already exists. Skipping creation.`);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await Admin.create({
    name: 'Yamini Admin',
    username: ADMIN_USERNAME.toLowerCase(),
    password: hashedPassword,
    role: 'superadmin',
  });

  console.log('Admin account created:');
  console.log(`  Username: ${ADMIN_USERNAME}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
