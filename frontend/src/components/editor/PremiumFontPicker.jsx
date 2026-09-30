import { useMemo, useState } from 'react';
import { FONT_CATEGORIES, PREMIUM_FONT_ENTRIES } from '../../catalog/premiumFonts';
import './PremiumFontPicker.css';

const RECENT_KEY = 'yamini-recent-fonts';

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function pushRecent(family) {
  const next = [family, ...readRecent().filter((f) => f !== family)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function PremiumFontPicker({ value, disabled, onChange }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('popular');

  const fonts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = PREMIUM_FONT_ENTRIES;
    if (category === 'popular') {
      list = PREMIUM_FONT_ENTRIES.filter((f) => f.category === 'popular' || f.category === 'display').slice(0, 8);
    } else if (category !== 'all') {
      list = PREMIUM_FONT_ENTRIES.filter((f) => f.category === category);
    }
    if (q) {
      list = PREMIUM_FONT_ENTRIES.filter(
        (f) => f.family.toLowerCase().includes(q) || f.sample.toLowerCase().includes(q)
      );
    }
    const recent = readRecent();
    const recentEntries = recent
      .map((family) => PREMIUM_FONT_ENTRIES.find((f) => f.family === family))
      .filter(Boolean);
    if (category === 'popular' && !q) {
      return [...recentEntries, ...list.filter((f) => !recent.includes(f.family))];
    }
    return list;
  }, [category, query]);

  const pick = (family) => {
    if (disabled) return;
    pushRecent(family);
    onChange(family);
  };

  return (
    <div className="premium-font-picker">
      <label className="editor-property-label premium-font-picker__search">
        Search fonts
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="English, Telugu, Hindi…"
          disabled={disabled}
        />
      </label>
      <div className="premium-font-picker__chips" role="tablist" aria-label="Font categories">
        {FONT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={category === cat.id}
            className={`premium-font-picker__chip${category === cat.id ? ' is-active' : ''}`}
            onClick={() => setCategory(cat.id)}
            disabled={disabled}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <ul className="premium-font-picker__list" role="listbox" aria-label="Fonts">
        {fonts.map((font) => (
          <li key={`${font.family}-${font.sample}`}>
            <button
              type="button"
              role="option"
              aria-selected={value === font.family}
              className={`premium-font-picker__item${value === font.family ? ' is-active' : ''}`}
              style={{ fontFamily: font.family }}
              disabled={disabled}
              onClick={() => pick(font.family)}
            >
              <span className="premium-font-picker__name">{font.family}</span>
              <span className="premium-font-picker__sample">{font.sample}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
