require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const CATEGORIES = [
  { name: 'Birthday', slug: 'birthday' },
  { name: 'Marriage', slug: 'marriage' },
  { name: 'Shop Boards', slug: 'shop-boards' },
  { name: 'Religious', slug: 'religious' },
  { name: 'Shraddhanjali', slug: 'shraddhanjali' },
  { name: 'Functions', slug: 'functions' },
  { name: 'Baby/Saree', slug: 'baby-saree' },
  { name: 'Political', slug: 'political' },
  { name: 'Cinema/Mass', slug: 'cinema-mass' },
  { name: 'Business', slug: 'business' },
  { name: 'Banners', slug: 'banners' },
  { name: 'Flex Boards', slug: 'flex-boards' },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/yamini_flex_printing');

  let created = 0;
  let skipped = 0;
  for (const category of CATEGORIES) {
    const existing = await Category.findOne({ slug: category.slug });
    if (existing) {
      skipped += 1;
      continue;
    }
    await Category.create(category);
    created += 1;
  }

  console.log(`Categories created: ${created}, skipped (already existed): ${skipped}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
