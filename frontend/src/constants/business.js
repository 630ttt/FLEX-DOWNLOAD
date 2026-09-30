export const BUSINESS = {
  name: 'YAMINI FLEX PRINTING',
  location: 'Cherukupalli',
  address: 'Behind Bhaskar Theatre, Tenali Road, Cherukupalli',
  fullAddress: 'Behind Bhaskar Theatre, Tenali Road, Cherukupalli, Guntur Dist, Andhra Pradesh - 522329',
  phone: '7801016470',
  workingHours: 'Monday - Sunday | 8:30 AM - 9:30 PM | Fast turnaround',
};

export const WHATSAPP_LINK = `https://wa.me/91${BUSINESS.phone}`;
export const whatsappLinkWithMessage = (message) => `${WHATSAPP_LINK}?text=${encodeURIComponent(message)}`;

export const SERVICES = [
  'Flex',
  'Star Flex',
  'Back Light',
  'Vinyl Stickers',
  'One Way Vision',
  'Home Boards',
  'Visiting Cards',
  'Foam Boards',
];

export const HERO_STATS = [
  { label: '5,000+', sub: 'Telugu & English Layouts' },
  { label: '1440 DPI', sub: 'Industrial Print Quality' },
  { label: '2 Hours', sub: `Express Dispatch ${BUSINESS.location}` },
];

export const HERO_HIGHLIGHTS = ['100% Waterproof Inks', '350+ sq.ft/hr Output', 'Direct WhatsApp Quote'];

// Business-wide print capability info shown on the Design Details page (not per-design claims)
export const PRINT_SPECIFICATIONS = [
  { label: 'Ink Grade', value: 'Outdoor UV, 3 Yrs' },
  { label: 'Weatherproof', value: '100% Water/Sun Safe' },
  { label: 'Edge Finishing', value: 'Hemmed + Rings' },
  { label: 'Delivery Hub', value: BUSINESS.location },
];

export const ORDER_ASSURANCES = [
  'WhatsApp Proof Before Print',
  '2-Hour Express Pickup',
  'Studio Pickup Available',
];

export const DELIVERY_MODES = [
  {
    value: 'studio-pickup',
    label: 'Studio Pickup (Free)',
    description: `${BUSINESS.name}, ${BUSINESS.address}. Ready in ~2 hours.`,
  },
  {
    value: 'home-dispatch',
    label: 'Home / Function Hall Dispatch',
    description: `${BUSINESS.location}, Tenali, Repalle, Bapatla, Ponnur & surrounding villages. Same-day local auto/courier.`,
  },
];

// unit: 'sqft' | 'unit' | '1000cards'
export const SERVICE_DETAILS = [
  {
    name: 'Flex Printing',
    tagline: 'Front-lit & Heavy-Duty',
    description: 'Front-lit & heavy-duty banner for hoardings, campaigns, and stage setups with vivid UV pigments.',
    price: 8,
    unit: 'sqft',
  },
  {
    name: 'Star Flex',
    tagline: 'Glossy • Anti-Glare Finish',
    description: 'High durability, premium glossy finish with ultra-smooth resistance to sunlight fading and moisture.',
    price: 14,
    unit: 'sqft',
  },
  {
    name: 'Back Light',
    tagline: 'Illuminated Signage',
    description: 'Glowing display boards, illuminated retail signage, and light boxes with superior light diffusion.',
    price: 25,
    unit: 'sqft',
  },
  {
    name: 'Vinyl Stickers',
    tagline: 'Self-Adhesive • Matt/Gloss',
    description: 'Self-adhesive vinyl stickers, die-cut vehicle wraps, product stickers, and glass graphics.',
    price: 20,
    unit: 'sqft',
  },
  {
    name: 'One Way Vision',
    tagline: 'Micro-Perforated Mesh',
    description: 'Perforated glass film for shopfronts and cars providing privacy while retaining indoor visibility.',
    price: 45,
    unit: 'sqft',
  },
  {
    name: 'Home Boards',
    tagline: 'Custom Nameplates & Acrylic',
    description: 'Nameplates, housewarming plaques, custom metal/acrylic embossed lettering, and decorative residence signs.',
    price: 350,
    unit: 'unit',
  },
  {
    name: 'Visiting Cards',
    tagline: 'Matte, Velvet, Spot UV',
    description: 'Premium matte, gloss, velvet & embossed visiting cards with sharp typography and 350 GSM cardstocks.',
    price: 350,
    unit: '1000cards',
  },
  {
    name: 'Foam Boards',
    tagline: '3mm & 5mm Sturdy Mount',
    description: 'Sturdy lightweight 3mm/5mm display boards for exhibitions, stage presentations, and architectural mockups.',
    price: 65,
    unit: 'sqft',
  },
];

export const UNIT_LABELS = {
  sqft: '/ sq.ft',
  unit: '/ unit',
  '1000cards': '/ 1000 cards',
};

// Materials available in the quick rate calculator (per sq.ft pricing)
export const RATE_CARD_MATERIALS = SERVICE_DETAILS.filter((s) => s.unit === 'sqft').map((s) => ({
  name: s.name,
  price: s.price,
}));

export const TRENDING_SEARCHES = ['Birthday', 'Marriage', 'BD1025', 'Shop Board', 'Political', 'Flex Banner'];

// Icon key resolved to an icon component in the Home page (keeps constants framework-agnostic)
export const CATEGORY_ICON_KEYS = {
  birthday: 'birthday',
  marriage: 'marriage',
  'shop-boards': 'shop',
  religious: 'religious',
  shraddhanjali: 'memorial',
  functions: 'functions',
  'baby-saree': 'baby',
  political: 'political',
  'cinema-mass': 'cinema',
  business: 'business',
  banners: 'banner',
  'flex-boards': 'board',
};

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Choose a Design',
    description: 'Explore 5000+ categorized templates or share your unique reference layout, poster idea, or past hoarding image.',
  },
  {
    step: 2,
    title: 'Customize',
    description: 'Provide event photos, family names, Telugu/English headlines, specific dimensions (e.g. 10x6 ft), and substrate type.',
  },
  {
    step: 3,
    title: 'Place Order',
    description: `Confirm your flex order via website form, phone call, or quick WhatsApp dispatch with our sales desk in ${BUSINESS.location}.`,
  },
  {
    step: 4,
    title: 'Make Payment',
    description: 'Pay securely through instant UPI, Google Pay, PhonePe, Paytm, or Net Banking with automated digital invoice receipts.',
  },
  {
    step: 5,
    title: 'We Prepare Your Design',
    description: 'Our experienced DTP designers compose the layout and generate a high-definition WhatsApp proof for your final check.',
  },
  {
    step: 6,
    title: 'Download/Print',
    description: 'High-speed Japanese eco-solvent flex printing with same-day studio pickup behind Bhaskar Theatre or direct local bus/courier dispatch.',
  },
];

export const WHY_CHOOSE_US = [
  {
    title: '5,000+ Designs',
    description: 'Extensive library of authentic Telugu typographic motifs, traditional wedding mandap backdrops, and modern business templates.',
  },
  {
    title: 'Easy Customization',
    description: 'Custom size scaling from small 2x3ft banners to 40x20ft highway billboards, with quick Telugu font typesetting and photo edits.',
  },
  {
    title: 'Quality Printing',
    description: '1440 DPI Japanese eco-solvent printheads using eco-friendly, weather-proof and anti-fade UV inks engineered for scorching sun exposure.',
  },
  {
    title: 'Easy Ordering',
    description: 'No complicated technical jargon. Just send the photos, text requirements over WhatsApp or call us directly.',
  },
  {
    title: 'Fast Response',
    description: 'Dedicated graphic designers attending your proof reviews within 15 minutes with live WhatsApp connection.',
  },
  {
    title: 'Local Service',
    description: `${BUSINESS.location}'s trusted hub. Fast dispatch across Bhattiprolu, Repalle, Tenali, Ponnur, and surrounding rural routes.`,
  },
];
