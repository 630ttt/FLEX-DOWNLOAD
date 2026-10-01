const mongoose = require('mongoose');

const defaultProductShowcaseItems = [
  { name: 'Banners', category: 'Large format', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
  { name: 'Posters', category: 'Events & retail', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
  { name: 'Invitations', category: 'Celebrations', image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=85&auto=format&fit=crop', to: '/templates' },
  { name: 'Business Cards', category: 'Brand identity', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
  { name: 'Flyers', category: 'Promotions', image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
  { name: 'Wedding Invitations', category: 'Weddings', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=85&auto=format&fit=crop', to: '/templates' },
  { name: 'Event Posters', category: 'Events', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
  { name: 'Social Media Creatives', category: 'Digital-first', image: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=85&auto=format&fit=crop', to: '/inspiration' },
];

const defaultInspirationGalleryItems = [
  { src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=85&auto=format&fit=crop', label: 'Wedding', tall: true },
  { src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=85&auto=format&fit=crop', label: 'Festival poster' },
  { src: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&q=85&auto=format&fit=crop', label: 'Business ad' },
  { src: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=900&q=85&auto=format&fit=crop', label: 'Corporate', wide: true },
  { src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=85&auto=format&fit=crop', label: 'Birthday' },
  { src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=85&auto=format&fit=crop', label: 'Event banner', tall: true },
  { src: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=900&q=85&auto=format&fit=crop', label: 'Social creative' },
  { src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&q=85&auto=format&fit=crop', label: 'Invitation' },
  { src: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&q=85&auto=format&fit=crop', label: 'Design studio' },
  { src: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=900&q=85&auto=format&fit=crop', label: 'Celebration', short: true },
  { src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=900&q=85&auto=format&fit=crop', label: 'Event details', short: true },
  { src: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=85&auto=format&fit=crop', label: 'Celebration lights', short: true },
  { src: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=900&q=85&auto=format&fit=crop', label: 'Reception detail', short: true },
];

const adminSettingsSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true, trim: true, default: 'YAMINI FLEX PRINTING' },
    shopSubtitle: { type: String, trim: true, default: 'Cherukupalli' },
    phone: { type: String, trim: true, default: '7801016470' },
    whatsapp: { type: String, trim: true, default: '7801016470' },
    email: { type: String, trim: true, default: 'yamini.flex.printing@example.com' },
    address: { type: String, trim: true, default: 'Behind Bhaskar Theatre, Tenali Road, Cherukupalli' },
    logoText: { type: String, trim: true, default: 'YAMINI FLEX PRINTING' },
    primaryColor: { type: String, trim: true, default: '#0757b8' },
    secondaryColor: { type: String, trim: true, default: '#f5b800' },
    currency: { type: String, trim: true, default: 'INR' },
    paymentMode: { type: String, trim: true, default: 'Cash / UPI / PhonePe' },
    orderNotificationEmail: { type: Boolean, default: true },
    orderNotificationWhatsApp: { type: Boolean, default: true },
    autoDownloadAfterPayment: { type: Boolean, default: true },
    productShowcaseItems: {
      type: [
        {
          name: { type: String, default: 'Product' },
          category: { type: String, default: 'Custom print' },
          image: { type: String, default: '' },
          to: { type: String, default: '/catalogue' },
        }
      ],
      default: defaultProductShowcaseItems,
    },
    inspirationGalleryItems: {
      type: [
        {
          src: { type: String, default: '' },
          label: { type: String, default: 'Studio design' },
          tall: { type: Boolean, default: false },
          wide: { type: Boolean, default: false },
          short: { type: Boolean, default: false },
        }
      ],
      default: defaultInspirationGalleryItems,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
