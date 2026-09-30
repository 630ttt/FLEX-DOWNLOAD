/**
 * Generates original YAMINI Flex SVG element files referenced by the design catalog.
 * Brand palette: white + gold (no blue / burgundy UI accents in assets).
 * Run: node scripts/generate-yamini-elements.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOLD = '#c9a227';
const GOLD_DEEP = '#8c6a1d';
const GOLD_MID = '#b8902e';
const GOLD_LIGHT = '#d8be72';
const CHAMPAGNE = '#f2e8d3';
const WARM_ROSE = '#c9a88a';
const OLIVE = '#6b5e45';
const NEUTRAL_LINE = '#969188';
const FLAME = '#e8a85c';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'elements');

const categories = {
  flowers: { count: 32, draw: (i) => flower(i) },
  leaves: { count: 22, draw: (i) => leaf(i) },
  'floral-decorations': { count: 22, draw: (i) => floralDecor(i) },
  wedding: { count: 32, draw: (i) => wedding(i) },
  festival: { count: 32, draw: (i) => festival(i) },
  religious: { count: 32, draw: (i) => religious(i) },
  birthday: { count: 22, draw: (i) => birthday(i) },
  celebration: { count: 22, draw: (i) => celebration(i) },
  diya: { count: 22, draw: (i) => diya(i) },
  mandala: { count: 22, draw: (i) => mandala(i) },
  peacock: { count: 22, draw: (i) => peacock(i) },
  decorative: { count: 32, draw: (i) => decorative(i) },
  ribbons: { count: 22, draw: (i) => ribbon(i) },
  badges: { count: 22, draw: (i) => badge(i) },
  sparkles: { count: 22, draw: (i) => sparkle(i) },
  abstract: { count: 22, draw: (i) => abstract(i) },
  shapes: { count: 22, draw: (i) => shape(i) },
  icons: { count: 22, draw: (i) => icon(i) },
  dividers: { count: 22, draw: (i) => divider(i) },
};

const framesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'frames');

function wrap(viewBox, body, accent = GOLD_DEEP) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="200" height="200" role="img" aria-label="YAMINI element">
  <defs><style>.a{fill:${accent}} .b{fill:${OLIVE}} .c{fill:${GOLD}} .s{stroke:${accent};fill:none;stroke-width:2}</style></defs>
  ${body}
</svg>`;
}

function flower(i) {
  const petals = 5 + (i % 4);
  const hue = 38 + (i * 5) % 28;
  const accent = `hsl(${hue}, 45%, 52%)`;
  const centers = Array.from({ length: petals }, (_, p) => {
    const a = (p / petals) * Math.PI * 2;
    const x = 100 + Math.cos(a) * 38;
    const y = 100 + Math.sin(a) * 38;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="22" ry="36" fill="${accent}" transform="rotate(${(a * 180) / Math.PI + 90} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');
  return wrap('0 0 200 200', `${centers}<circle cx="100" cy="100" r="18" fill="${GOLD}"/>`);
}

function leaf(i) {
  const tilt = (i * 13) % 60 - 30;
  return wrap('0 0 120 200', `<path d="M60 16 C30 52 22 98 28 142 C34 170 48 188 60 196 C72 188 86 170 92 142 C98 98 90 52 60 16 Z" fill="${OLIVE}" transform="rotate(${tilt} 60 100)"/><path d="M60 30 L60 178" stroke="${GOLD_DEEP}" stroke-width="2.5" fill="none"/>`);
}

function floralDecor(i) {
  return wrap('0 0 200 120', `<path d="M10 80 Q60 ${20 + (i % 30)} 120 70 T190 ${40 + (i % 25)}" stroke="${GOLD_DEEP}" stroke-width="3" fill="none"/><circle cx="40" cy="55" r="8" fill="${WARM_ROSE}"/><circle cx="100" cy="45" r="6" fill="${OLIVE}"/><circle cx="155" cy="62" r="7" fill="${GOLD}"/>`);
}

function wedding(i) {
  return wrap('0 0 200 200', `<path d="M100 40 C70 70 50 100 50 130 C50 160 70 175 100 175 C130 175 150 160 150 130 C150 100 130 70 100 40 Z" fill="none" stroke="${GOLD}" stroke-width="4"/><path d="M85 95 L100 115 L115 95" stroke="${GOLD_DEEP}" stroke-width="3" fill="none"/><text x="100" y="155" text-anchor="middle" font-family="Georgia,serif" font-size="14" fill="${GOLD_DEEP}">${i % 2 ? '♥' : '&'}</text>`);
}

function festival(i) {
  const colors = [GOLD_DEEP, GOLD, GOLD_LIGHT, GOLD_MID];
  const c = colors[i % colors.length];
  return wrap('0 0 200 200', `<polygon points="100,20 ${120 + (i % 8)},80 180,80 ${130 + (i % 6)},120 150,180 100,145 50,180 70,120 20,80 80,80" fill="${c}" opacity="0.9"/>`);
}

function religious(i) {
  return wrap('0 0 200 200', `<circle cx="100" cy="100" r="70" fill="none" stroke="${GOLD}" stroke-width="3"/><path d="M100 45 L100 155 M70 75 L130 75 M70 125 L130 125" stroke="${GOLD_DEEP}" stroke-width="4"/><circle cx="100" cy="100" r="${12 + (i % 5)}" fill="${GOLD_LIGHT}" opacity="0.85"/>`);
}

function birthday(i) {
  return wrap('0 0 200 200', `<rect x="60" y="90" width="80" height="70" rx="8" fill="${WARM_ROSE}"/><rect x="55" y="80" width="90" height="18" rx="4" fill="${GOLD_DEEP}"/><circle cx="${75 + (i % 3) * 20}" cy="72" r="6" fill="${GOLD}"/>`);
}

function celebration(i) {
  return wrap('0 0 200 200', `<path d="M30 140 L50 60 L70 140 Z" fill="${GOLD_LIGHT}"/><path d="M90 140 L110 50 L130 140 Z" fill="${GOLD_DEEP}"/><path d="M150 140 L170 70 L190 140 Z" fill="${GOLD}"/>`);
}

function diya(i) {
  return wrap('0 0 200 160', `<ellipse cx="100" cy="110" rx="55" ry="22" fill="${GOLD}"/><path d="M70 110 Q100 ${70 - (i % 10)} 130 110" fill="${GOLD_LIGHT}"/><ellipse cx="100" cy="${78 - (i % 8)}" rx="8" ry="14" fill="${FLAME}"/>`);
}

function mandala(i) {
  const n = 8 + (i % 4);
  const rings = Array.from({ length: n }, (_, r) => {
    const rad = 20 + r * 7;
    return `<circle cx="100" cy="100" r="${rad}" fill="none" stroke="${GOLD_DEEP}" stroke-width="1.5" opacity="${0.35 + r * 0.05}"/>`;
  }).join('');
  return wrap('0 0 200 200', rings);
}

function peacock(i) {
  return wrap('0 0 200 200', `<path d="M100 160 Q60 120 70 80 Q100 100 130 80 Q140 120 100 160" fill="${GOLD_MID}"/><circle cx="85" cy="95" r="6" fill="${GOLD_DEEP}"/><circle cx="115" cy="95" r="6" fill="${GOLD_DEEP}"/><path d="M100 50 Q${80 + (i % 15)} 30 100 20 Q${120 - (i % 15)} 30 100 50" fill="${GOLD}"/>`);
}

function decorative(i) {
  return wrap('0 0 200 200', `<rect x="30" y="30" width="140" height="140" rx="12" fill="none" stroke="${GOLD_DEEP}" stroke-width="${2 + (i % 3)}"/><circle cx="30" cy="30" r="6" fill="${GOLD}"/><circle cx="170" cy="30" r="6" fill="${GOLD}"/><circle cx="30" cy="170" r="6" fill="${GOLD}"/><circle cx="170" cy="170" r="6" fill="${GOLD}"/>`);
}

function ribbon(i) {
  return wrap('0 0 200 120', `<path d="M10 50 H190" stroke="${GOLD_DEEP}" stroke-width="14" stroke-linecap="round"/><path d="M100 50 L80 95 L100 80 L120 95 Z" fill="${WARM_ROSE}"/>`);
}

function badge(i) {
  return wrap('0 0 200 200', `<circle cx="100" cy="100" r="72" fill="${GOLD_DEEP}"/><circle cx="100" cy="100" r="58" fill="none" stroke="${GOLD}" stroke-width="4"/><text x="100" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#fcfcf8">${(i % 9) + 1}</text>`);
}

function sparkle(i) {
  const rot = (i * 17) % 360;
  return wrap('0 0 200 200', `<g transform="rotate(${rot} 100 100)"><path d="M100 30 L106 94 L170 100 L106 106 L100 170 L94 106 L30 100 L94 94 Z" fill="${GOLD}"/></g>`);
}

function abstract(i) {
  return wrap('0 0 200 200', `<path d="M20 ${100 + (i % 20)} Q80 20 140 ${120 - (i % 15)} T180 ${80 + (i % 25)}" stroke="${GOLD_MID}" stroke-width="8" fill="none" stroke-linecap="round"/>`);
}

function shape(i) {
  const shapes = [
    `<rect x="40" y="40" width="120" height="120" rx="8" fill="${GOLD_DEEP}"/>`,
    `<circle cx="100" cy="100" r="60" fill="${OLIVE}"/>`,
    `<polygon points="100,35 165,165 35,165" fill="${GOLD}"/>`,
  ];
  return wrap('0 0 200 200', shapes[i % shapes.length]);
}

function icon(i) {
  return wrap('0 0 200 200', `<rect x="55" y="45" width="90" height="110" rx="10" fill="none" stroke="${GOLD_DEEP}" stroke-width="5"/><circle cx="100" cy="135" r="8" fill="${GOLD_DEEP}"/>`);
}

function divider(i) {
  return wrap('0 0 200 40', `<line x1="10" y1="20" x2="190" y2="20" stroke="${NEUTRAL_LINE}" stroke-width="2"/><circle cx="100" cy="20" r="${6 + (i % 4)}" fill="${GOLD_DEEP}"/>`);
}

function frameBorder(i) {
  const stroke = i % 3 === 0 ? GOLD : i % 3 === 1 ? GOLD_DEEP : GOLD_MID;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <rect x="8" y="8" width="384" height="284" fill="none" stroke="${stroke}" stroke-width="${6 + (i % 4)}"/>
  <rect x="20" y="20" width="360" height="260" fill="none" stroke="${stroke}" stroke-width="2" opacity="0.5"/>
  ${i % 2 ? `<circle cx="24" cy="24" r="6" fill="${GOLD}"/><circle cx="376" cy="24" r="6" fill="${GOLD}"/>` : ''}
</svg>`;
}

fs.mkdirSync(framesDir, { recursive: true });

for (const [category, { count, draw }] of Object.entries(categories)) {
  const dir = path.join(root, category);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 1; i <= count; i += 1) {
    const name = `${category}-${String(i).padStart(2, '0')}.svg`;
    fs.writeFileSync(path.join(dir, name), draw(i), 'utf8');
  }
}

const frameCategories = ['basic', 'decorative', 'creative'];
for (const cat of frameCategories) {
  const dir = path.join(framesDir, cat);
  fs.mkdirSync(dir, { recursive: true });
}
for (let i = 1; i <= 32; i += 1) {
  fs.writeFileSync(path.join(framesDir, 'decorative', `frame-decorative-${String(i).padStart(2, '0')}.svg`), frameBorder(i), 'utf8');
}

console.log('Generated element and frame SVG assets (gold brand palette).');
