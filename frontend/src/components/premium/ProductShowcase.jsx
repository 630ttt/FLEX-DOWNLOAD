import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DESIGN_PREVIEW_FALLBACK } from '../../utils/designAssets';
import { api } from '../../api/client';
import Reveal from '../Reveal';
import './ProductShowcase.css';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const resolveImageUrl = (src) => src?.startsWith('/') ? `${API_ORIGIN}${src}` : src;

const DEFAULT_PRODUCTS = [
  {
    name: 'Banners',
    category: 'Large format',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=85&auto=format&fit=crop',
    to: '/catalogue',
  },
  {
    name: 'Posters',
    category: 'Events & retail',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=85&auto=format&fit=crop',
    to: '/catalogue',
  },
  {
    name: 'Invitations',
    category: 'Celebrations',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=85&auto=format&fit=crop',
    to: '/templates',
  },
  {
    name: 'Business Cards',
    category: 'Brand identity',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=85&auto=format&fit=crop',
    to: '/catalogue',
  },
  {
    name: 'Flyers',
    category: 'Promotions',
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=85&auto=format&fit=crop',
    to: '/catalogue',
  },
  {
    name: 'Wedding Invitations',
    category: 'Weddings',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=85&auto=format&fit=crop',
    to: '/templates',
  },
  {
    name: 'Event Posters',
    category: 'Events',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=85&auto=format&fit=crop',
    to: '/catalogue',
  },
  {
    name: 'Social Media Creatives',
    category: 'Digital-first',
    image: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=85&auto=format&fit=crop',
    to: '/inspiration',
  },
];

const normalizeProducts = (items = []) => {
  if (!Array.isArray(items)) {
    return DEFAULT_PRODUCTS;
  }

  return items
    .filter((item) => item && (item.image || item.src))
    .map((item, index) => ({
      name: item.name || `Product ${index + 1}`,
      category: item.category || 'Custom print',
      image: item.image || item.src || DEFAULT_PRODUCTS[index % DEFAULT_PRODUCTS.length].image,
      to: item.to || '/catalogue',
    }))
    .slice(0, 8);
};

const ProductShowcase = () => {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);

  useEffect(() => {
    let active = true;

    api
      .get('/site-settings')
      .then((response) => {
        const saved = response?.data?.productShowcaseItems || response?.productShowcaseItems || DEFAULT_PRODUCTS;

        if (active) {
          setProducts(normalizeProducts(saved));
        }
      })
      .catch(() => {
        if (active) {
          setProducts(DEFAULT_PRODUCTS);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="premium-section product-showcase" aria-labelledby="product-showcase-title">
      <div className="premium-container">
        <Reveal>
          <div className="product-showcase__header">
            <span className="section-kicker">Print products</span>
            <h2 id="product-showcase-title" className="section-title">
              Everything you need to stand out
            </h2>
            <p className="product-showcase__subtitle">
              From storefront flex to intimate invitations — premium materials, vivid color, and studio-grade finishing.
            </p>
          </div>
        </Reveal>

        <div className="product-showcase__grid">
          {products.map((product, index) => (
            <Reveal key={`${product.name}-${index}`} delay={index * 60} className="product-showcase__cell">
              <Link to={product.to} className="product-showcase__card premium-card">
                <div className="product-showcase__media">
                  <img
                    src={resolveImageUrl(product.image)}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = DESIGN_PREVIEW_FALLBACK;
                    }}
                  />
                  <div className="product-showcase__meta">
                    <span>{product.category}</span>
                    <strong>{product.name}</strong>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
