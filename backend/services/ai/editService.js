const mockEditProvider = require('./mockEditProvider');

const MAX_LENGTHS = {
  name: 100,
  description: 240,
  phone: 32,
  address: 180,
  price: 32,
  date: 40,
  offer: 80,
};

const COLOR_KEYS = ['background', 'primary', 'text'];
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const validateValues = (value = {}) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Design values must be an object');
  }

  const validated = {};
  Object.entries(MAX_LENGTHS).forEach(([key, maxLength]) => {
    if (value[key] === undefined || value[key] === null) return;
    if (typeof value[key] !== 'string' && typeof value[key] !== 'number') {
      throw new Error(`Invalid ${key}`);
    }
    const text = String(value[key]).trim();
    if (text.length > maxLength) throw new Error(`${key} is too long`);
    if (key === 'price' && text && !/^(?:₹|[$€£])?\s*\d{1,8}(?:[.,]\d{1,2})?$/.test(text)) {
      throw new Error('Price must be a valid amount');
    }
    if (key === 'phone' && text && !/^[+\d() .-]+$/.test(text)) {
      throw new Error('Phone number contains unsupported characters');
    }
    validated[key] = text;
  });

  const colors = value.colors || {};
  if (!colors || typeof colors !== 'object' || Array.isArray(colors)) {
    throw new Error('Colors must be an object');
  }
  const validatedColors = {};
  COLOR_KEYS.forEach((key) => {
    if (colors[key] === undefined) return;
    if (typeof colors[key] !== 'string' || !HEX_COLOR.test(colors[key])) {
      throw new Error(`Invalid ${key} color`);
    }
    validatedColors[key] = colors[key].toLowerCase();
  });
  if (Object.keys(validatedColors).length) validated.colors = validatedColors;

  return validated;
};

const interpretEdits = async ({ instructions = '', values = {} }) => {
  if (typeof instructions !== 'string' || instructions.length > 1200) {
    throw new Error('Instructions must be 1200 characters or fewer');
  }

  const submitted = validateValues(values);
  const providerName = process.env.AI_EDIT_PROVIDER || 'mock';
  const provider = providerName === 'mock' ? mockEditProvider : null;
  if (!provider) throw new Error(`AI edit provider "${providerName}" is not configured`);

  const providerEdits = await provider.interpret({ instructions: instructions.trim(), values: submitted });
  const parsed = validateValues(providerEdits);
  const edits = {
    ...submitted,
    ...parsed,
    ...(submitted.colors || parsed.colors
      ? { colors: { ...(submitted.colors || {}), ...(parsed.colors || {}) } }
      : {}),
  };

  return { provider: providerName, edits };
};

module.exports = { interpretEdits, validateValues };
