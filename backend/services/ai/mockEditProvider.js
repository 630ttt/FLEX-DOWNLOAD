const COLOR_NAMES = {
  black: '#111827',
  blue: '#2563eb',
  cyan: '#06b6d4',
  green: '#16a34a',
  gold: '#d4a017',
  orange: '#ea580c',
  pink: '#db2777',
  purple: '#7c3aed',
  red: '#dc2626',
  white: '#ffffff',
  yellow: '#eab308',
};

const readValue = (instructions, aliases) => {
  const pattern = new RegExp(
    `\\b(?:${aliases})\\b\\s*(?:to|as|:|=)\\s*(?:"([^"]*)"|'([^']*)'|([^,.;\\n]+))`,
    'i'
  );
  const match = instructions.match(pattern);
  return match ? (match[1] || match[2] || match[3] || '').trim() : undefined;
};

const readColor = (instructions, subject) => {
  const match = instructions.match(
    new RegExp(`\\b(?:make|change|set)\\s+(?:the\\s+)?${subject}(?:\\s+color)?\\s+(?:to\\s+)?([a-z]+|#[0-9a-f]{3,8})`, 'i')
  );
  if (!match) return undefined;
  const color = match[1].toLowerCase();
  return COLOR_NAMES[color] || (color.startsWith('#') ? color : undefined);
};

const interpret = async ({ instructions }) => {
  const edits = {};
  const fields = {
    name: '(?:business\\s+name|company\\s+name|name)',
    description: 'description',
    phone: '(?:phone(?:\\s+number)?|mobile(?:\\s+number)?|contact)',
    address: 'address',
    price: 'price',
    date: '(?:event\\s+date|date)',
    offer: '(?:offer|discount)',
  };

  Object.entries(fields).forEach(([key, aliases]) => {
    const value = readValue(instructions, aliases);
    if (value !== undefined) edits[key] = value;
  });

  const discount = instructions.match(/(?:add|apply|set)\s+(?:an?\s+)?(\d{1,3}\s*%)\s*(?:discount|off)?/i);
  if (discount && edits.offer === undefined) edits.offer = `${discount[1].replace(/\s/g, '')} off`;

  const background = readColor(instructions, 'background');
  const primary = readColor(instructions, '(?:primary\\s+)?(?:accent|brand\\s+)?color');
  const text = readColor(instructions, 'text');
  const colors = {};
  if (background) colors.background = background;
  if (primary) colors.primary = primary;
  if (text) colors.text = text;
  if (Object.keys(colors).length) edits.colors = colors;

  return edits;
};

module.exports = { interpret };
