const AdminSettings = require('../models/AdminSettings');
const { saveUpload } = require('../services/fileStorage');

const defaultSettings = {
  shopName: 'YAMINI FLEX PRINTING',
  shopSubtitle: 'Cherukupalli',
  phone: '7801016470',
  whatsapp: '7801016470',
  email: 'yamini.flex.printing@example.com',
  address: 'Behind Bhaskar Theatre, Tenali Road, Cherukupalli',
  logoText: 'YAMINI FLEX PRINTING',
  primaryColor: '#0757b8',
  secondaryColor: '#f5b800',
  currency: 'INR',
  paymentMode: 'Cash / UPI / PhonePe',
  orderNotificationEmail: true,
  orderNotificationWhatsApp: true,
  autoDownloadAfterPayment: true,
  productShowcaseItems: [
    { name: 'Banners', category: 'Large format', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
    { name: 'Posters', category: 'Events & retail', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
    { name: 'Invitations', category: 'Celebrations', image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=85&auto=format&fit=crop', to: '/templates' },
    { name: 'Business Cards', category: 'Brand identity', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
    { name: 'Flyers', category: 'Promotions', image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
    { name: 'Wedding Invitations', category: 'Weddings', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=85&auto=format&fit=crop', to: '/templates' },
    { name: 'Event Posters', category: 'Events', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
    { name: 'Social Media Creatives', category: 'Digital-first', image: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=85&auto=format&fit=crop', to: '/inspiration' },
  ],
  inspirationGalleryItems: [
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
  ],
};

const getAdminSettings = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = await AdminSettings.create(defaultSettings);
    }

    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Unable to load admin settings' });
  }
};

const getPublicSiteSettings = async (_req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = await AdminSettings.create(defaultSettings);
    }

    const data = settings.toObject();
    return res.json({
      success: true,
      data: {
        productShowcaseItems: data.productShowcaseItems || defaultSettings.productShowcaseItems,
        inspirationGalleryItems: data.inspirationGalleryItems || defaultSettings.inspirationGalleryItems,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Unable to load homepage settings' });
  }
};

const uploadHomepageSectionImage = async (req, res) => {
  try {
    const { section, index } = req.body || {};
    let submittedItems = null;
    try {
      submittedItems = req.body?.items ? JSON.parse(req.body.items) : null;
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid homepage image item data' });
    }
    const itemIndex = Number(index);
    const field = section === 'products' ? 'productShowcaseItems' :
      section === 'inspiration' ? 'inspirationGalleryItems' : '';

    if (!field || !Number.isInteger(itemIndex) || itemIndex < 0) {
      return res.status(400).json({ success: false, message: 'Invalid homepage image target' });
    }
    if (!req.file || !/^image\/(jpeg|png|webp|gif)$/i.test(req.file.mimetype || '')) {
      return res.status(400).json({ success: false, message: 'Choose a JPG, PNG, WebP, or GIF image' });
    }

    const settings = await AdminSettings.findOne() || await AdminSettings.create(defaultSettings);
    const savedItems = (settings[field] || defaultSettings[field]).map((item) => item.toObject ? item.toObject() : { ...item });
    const items = Array.isArray(submittedItems) ? submittedItems : savedItems;
    if (itemIndex >= items.length) {
      return res.status(404).json({ success: false, message: 'Homepage image item was not found' });
    }

    const imageUrl = await saveUpload(req.file);
    items[itemIndex] = {
      ...items[itemIndex],
      ...(section === 'products' ? { image: imageUrl } : { src: imageUrl }),
    };
    settings.set(field, items);
    await settings.save();

    return res.json({ success: true, message: 'Homepage image uploaded', data: { imageUrl } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Unable to upload homepage image' });
  }
};

const updateAdminSettings = async (req, res) => {
  try {
    const incoming = req.body || {};
    const allowedFields = Object.keys(defaultSettings);

    const clean = {};
    allowedFields.forEach((key) => {
      if (incoming[key] !== undefined) {
        clean[key] = incoming[key];
      }
    });

    const merged = { ...defaultSettings, ...clean };

    if (!merged.shopName || !String(merged.shopName).trim()) {
      return res.status(400).json({ success: false, message: 'Shop name is required' });
    }

    if (!merged.phone || !String(merged.phone).trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const settings = await AdminSettings.findOneAndUpdate(
      {},
      { $set: merged },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, message: 'Admin settings updated successfully', data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Unable to update admin settings' });
  }
};

module.exports = {
  defaultSettings,
  getAdminSettings,
  getPublicSiteSettings,
  uploadHomepageSectionImage,
  updateAdminSettings,
};
