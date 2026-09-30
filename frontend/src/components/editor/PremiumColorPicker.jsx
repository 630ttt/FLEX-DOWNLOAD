import { useMemo, useState } from 'react';
import './PremiumColorPicker.css';

const PALETTES = {
  'Luxury Gold': ['#fbf6e8', '#e8d48a', '#c9a227', '#a8841a', '#5c4a0f', '#141414'],
  Royal: ['#1a1033', '#3d2a6e', '#6b4bb3', '#c9a227', '#f4efe6', '#ffffff'],
  Wedding: ['#fff8f5', '#f5d5c8', '#e8a598', '#c9a227', '#8c6a1d', '#2d1810'],
  Festival: ['#ff6b35', '#f7c948', '#6bcb77', '#4d96ff', '#9b5de5', '#141414'],
  Minimal: ['#ffffff', '#f5f5f5', '#d4d4d4', '#737373', '#404040', '#141414'],
  Corporate: ['#0f2b46', '#1e4d7a', '#3d7ab8', '#94a3b8', '#e2e8f0', '#ffffff'],
  'Traditional Indian': ['#8b0000', '#c9a227', '#ff9933', '#138808', '#f5e6d3', '#2c1810'],
  Pastel: ['#fde2e4', '#e2ece9', '#dfe7fd', '#fff1e6', '#f3d5b5', '#5a5a5a'],
  'Dark Luxury': ['#0f0f0f', '#1f1b16', '#3d3428', '#c9a227', '#e8d48a', '#f8f4ef'],
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(n, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

export default function PremiumColorPicker({ value = '#000000', opacity = 1, disabled, onChange, onOpacityChange, showOpacity = false }) {
  const [paletteName, setPaletteName] = useState('Luxury Gold');
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('yamini-recent-colors') || '[]');
    } catch {
      return [];
    }
  });

  const rgb = useMemo(() => hexToRgb(value || '#000000'), [value]);
  const palette = PALETTES[paletteName] || PALETTES['Luxury Gold'];

  const apply = (hex) => {
    if (disabled) return;
    const next = [...new Set([hex, ...recent])].slice(0, 8);
    setRecent(next);
    localStorage.setItem('yamini-recent-colors', JSON.stringify(next));
    onChange(hex);
  };

  return (
    <div className="premium-color-picker">
      <div className="premium-color-picker__row">
        <label className="editor-property-label premium-color-picker__swatch">
          Color
          <input type="color" value={value} disabled={disabled} onChange={(e) => apply(e.target.value)} />
        </label>
        <label className="editor-property-label">
          HEX
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (/^#[0-9a-fA-F]{6}$/.test(v)) apply(v);
            }}
          />
        </label>
      </div>
      <div className="premium-color-picker__row premium-color-picker__rgb">
        <label className="editor-property-label">
          R
          <input
            type="number"
            min={0}
            max={255}
            value={rgb.r}
            disabled={disabled}
            onChange={(e) => apply(rgbToHex(Number(e.target.value), rgb.g, rgb.b))}
          />
        </label>
        <label className="editor-property-label">
          G
          <input
            type="number"
            min={0}
            max={255}
            value={rgb.g}
            disabled={disabled}
            onChange={(e) => apply(rgbToHex(rgb.r, Number(e.target.value), rgb.b))}
          />
        </label>
        <label className="editor-property-label">
          B
          <input
            type="number"
            min={0}
            max={255}
            value={rgb.b}
            disabled={disabled}
            onChange={(e) => apply(rgbToHex(rgb.r, rgb.g, Number(e.target.value)))}
          />
        </label>
      </div>
      {showOpacity && onOpacityChange && (
        <label className="editor-property-label">
          Opacity
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            disabled={disabled}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
          />
        </label>
      )}
      <label className="editor-property-label">
        Palette
        <select value={paletteName} disabled={disabled} onChange={(e) => setPaletteName(e.target.value)}>
          {Object.keys(PALETTES).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>
      <div className="premium-color-picker__grid" role="list">
        {palette.map((hex) => (
          <button
            key={hex}
            type="button"
            className={`premium-color-picker__dot${value === hex ? ' is-active' : ''}`}
            style={{ background: hex }}
            aria-label={hex}
            disabled={disabled}
            onClick={() => apply(hex)}
          />
        ))}
      </div>
      {recent.length > 0 && (
        <>
          <span className="premium-color-picker__label">Recent</span>
          <div className="premium-color-picker__grid">
            {recent.map((hex) => (
              <button
                key={hex}
                type="button"
                className="premium-color-picker__dot"
                style={{ background: hex }}
                disabled={disabled}
                onClick={() => apply(hex)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
