export const FONT_CATEGORIES = [
  { id: 'popular', label: 'Popular' },
  { id: 'english', label: 'English' },
  { id: 'display', label: 'Display' },
  { id: 'telugu', label: 'Telugu' },
  { id: 'hindi', label: 'Hindi' },
  { id: 'tamil', label: 'Tamil' },
  { id: 'kannada', label: 'Kannada' },
  { id: 'malayalam', label: 'Malayalam' },
  { id: 'marathi', label: 'Marathi' },
  { id: 'bengali', label: 'Bengali' },
];

export const PREMIUM_FONT_ENTRIES = [
  { family: 'Plus Jakarta Sans', category: 'popular', sample: 'Wedding Celebration' },
  { family: 'Instrument Serif', category: 'popular', sample: 'Create. Customize. Print.' },
  { family: 'Playfair Display', category: 'display', sample: 'Premium Invitations' },
  { family: 'Cormorant Garamond', category: 'display', sample: 'Luxury Print Studio' },
  { family: 'Georgia', category: 'english', sample: 'Business Opening Banner' },
  { family: 'Arial', category: 'english', sample: 'Festival Flex Design' },
  { family: 'Segoe UI', category: 'english', sample: 'Social Media Poster' },
  { family: 'Times New Roman', category: 'english', sample: 'Traditional Event Banner' },
  { family: 'Noto Sans Telugu', category: 'telugu', sample: 'శ్రీ గణేష్ చతుర్థి' },
  { family: 'Noto Serif Telugu', category: 'telugu', sample: 'వివాహ ఆహ్వానం' },
  { family: 'Noto Sans Devanagari', category: 'hindi', sample: 'श्री गणेश चतुर्थी' },
  { family: 'Noto Serif Devanagari', category: 'hindi', sample: 'विवाह समारोह' },
  { family: 'Noto Sans Tamil', category: 'tamil', sample: 'திருமண விழா' },
  { family: 'Noto Sans Kannada', category: 'kannada', sample: 'ಮದುವೆ ಆಹ್ವಾನ' },
  { family: 'Noto Sans Malayalam', category: 'malayalam', sample: 'വിവാഹ ആഹ്വാനം' },
  { family: 'Noto Sans Bengali', category: 'bengali', sample: 'বিবাহ অনুষ্ঠান' },
  { family: 'Noto Sans Devanagari', category: 'marathi', sample: 'गणेशोत्सव बॅनर' },
];

export const PREMIUM_FONT_FAMILIES = [...new Set(PREMIUM_FONT_ENTRIES.map((f) => f.family))];
