import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FaSearch,
  FaTimes,
  FaThLarge,
  FaList,
  FaArrowRight,
  FaWhatsapp,
  FaPhoneAlt,
  FaLayerGroup,
} from 'react-icons/fa';

import { api } from '../../api/client';
import {
  BUSINESS,
  WHATSAPP_LINK,
  whatsappLinkWithMessage,
  TRENDING_SEARCHES,
} from '../../constants/business';

import Loader from '../../components/Loader';
import CataloguePagination from '../../components/CataloguePagination';
import DesignPreviewImage from '../../components/DesignPreviewImage';

import './Catalogue.css';


// =========================================================
// SORT OPTIONS
// =========================================================

const SORT_OPTIONS = [
  {
    value: 'latest',
    label: 'Latest',
  },
  {
    value: 'popular',
    label: 'Popular',
  },
  {
    value: 'price-asc',
    label: 'Price: Low to High',
  },
  {
    value: 'price-desc',
    label: 'Price: High to Low',
  },
];


// =========================================================
// NEW DESIGN CHECK
// =========================================================

const isNew = (createdAt) =>
  Date.now() - new Date(createdAt).getTime() <
  7 * 24 * 60 * 60 * 1000;


// =========================================================
// CATALOGUE COMPONENT
// =========================================================

const Catalogue = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [designs, setDesigns] = useState([]);
  const [categories, setCategories] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 20,
  });

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') || ''
  );


  // =========================================================
  // URL PARAMETERS
  // =========================================================

  const page =
    parseInt(searchParams.get('page'), 10) || 1;

  const category =
    searchParams.get('category') || '';

  const search =
    searchParams.get('search') || '';

  const sort =
    searchParams.get('sort') || 'latest';


  // =========================================================
  // FETCH CATEGORIES
  // =========================================================

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => {
        setCategories(res.data);
      })
      .catch(() => {});
  }, []);


  // =========================================================
  // FETCH DESIGNS
  // =========================================================

  useEffect(() => {
    setLoading(true);

    api
      .get('/designs', {
        page,
        limit: 12,
        category,
        search,
        sort,
      })
      .then((res) => {
        setDesigns(res.data);
        setPagination(res.pagination);
      })
      .catch(() => {
        setDesigns([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, category, search, sort]);


  // =========================================================
  // TOTAL DESIGNS
  // =========================================================

  const totalDesignsAcrossCatalogue = useMemo(
    () =>
      categories.reduce(
        (sum, cat) => sum + (cat.designCount || 0),
        0
      ),
    [categories]
  );


  // =========================================================
  // UPDATE URL PARAMETERS
  // =========================================================

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });

    setSearchParams(next);
  };


  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    updateParams({
      search: searchInput,
      page: 1,
    });
  };


  // =========================================================
  // CLEAR SEARCH
  // =========================================================

  const clearSearch = () => {
    setSearchInput('');

    updateParams({
      search: '',
      page: 1,
    });
  };


  // =========================================================
  // PAGINATION RANGE
  // =========================================================

  const rangeStart =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;

  const rangeEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="page-container catalogue-page">

      {/* =====================================================
          BREADCRUMB
      ===================================================== */}

      <nav className="catalogue-breadcrumb">
        <Link to="/">Home</Link>

        <span>/</span>

        <Link to="/catalogue">
          Designs
        </Link>

        <span>/</span>

        <span>Design Catalogue</span>
      </nav>


      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="catalogue-header page-hero-strip">

        <div>

          <span className="eyebrow catalogue-live-badge">
            <FaLayerGroup />
            Live Studio Inventory
          </span>

          <h1 className="section-title">
            Design Catalogue
          </h1>

          <p className="section-subtitle">
            Explore print-ready designs for birthdays,
            marriages, temple functions, commercial stores,
            and political rallies. Fully customizable in
            Telugu and English.
          </p>

        </div>


        {/* ===================================================
            STAT CARD
        =================================================== */}

        <div className="catalogue-stat-card card">

          <FaLayerGroup className="catalogue-stat-icon" />

          <div>

            <span className="catalogue-stat-value">
              {totalDesignsAcrossCatalogue || pagination.total}+
            </span>

            <span className="catalogue-stat-label">
              Active Layout Templates
            </span>

          </div>

        </div>

      </div>


      {/* =====================================================
          SEARCH BAR
      ===================================================== */}

      <form
        className="catalogue-search-bar"
        onSubmit={handleSearchSubmit}
      >

        <FaSearch className="catalogue-search-icon" />

        <input
          type="text"
          placeholder="Search by Design ID, Telugu font, event, or business name..."
          value={searchInput}
          onChange={(e) =>
            setSearchInput(e.target.value)
          }
        />

        {searchInput && (
          <button
            type="button"
            className="catalogue-search-clear"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            <FaTimes />
          </button>
        )}

        <button
          type="submit"
          className="btn btn-primary"
        >
          <FaSearch />
          Search Templates
        </button>

      </form>


      {/* =====================================================
          POPULAR SEARCHES
      ===================================================== */}

      <div className="catalogue-popular-row">

        <span>
          Popular:
        </span>

        {TRENDING_SEARCHES.map((term) => (
          <button
            key={term}
            type="button"
            className="tag catalogue-popular-tag"
            onClick={() => {
              setSearchInput(term);

              updateParams({
                search: term,
                page: 1,
              });
            }}
          >
            {term}
          </button>
        ))}

      </div>


      {/* =====================================================
          CATEGORY FILTERS
      ===================================================== */}

      <div className="catalogue-category-pills">

        <button
          type="button"
          className={`catalogue-pill${
            category === ''
              ? ' catalogue-pill-active'
              : ''
          }`}
          onClick={() =>
            updateParams({
              category: '',
              page: 1,
            })
          }
        >
          All Categories

          <span>
            {totalDesignsAcrossCatalogue}
          </span>
        </button>


        {categories.map((cat) => (
          <button
            key={cat._id}
            type="button"
            className={`catalogue-pill${
              category === cat._id
                ? ' catalogue-pill-active'
                : ''
            }`}
            onClick={() =>
              updateParams({
                category: cat._id,
                page: 1,
              })
            }
          >
            {cat.name}

            <span>
              {cat.designCount}
            </span>
          </button>
        ))}

      </div>


      {/* =====================================================
          RESULTS BAR
      ===================================================== */}

      <div className="catalogue-results-bar">

        <span className="catalogue-results-count">

          {pagination.total > 0
            ? `Showing ${rangeStart}-${rangeEnd} of ${pagination.total} designs`
            : 'No designs found'}

        </span>


        <div className="catalogue-results-actions">

          {/* SORT */}

          <select
            className="form-select catalogue-sort-select"
            value={sort}
            onChange={(e) =>
              updateParams({
                sort: e.target.value,
                page: 1,
              })
            }
          >

            {SORT_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
              >
                Sort: {opt.label}
              </option>
            ))}

          </select>


          {/* VIEW TOGGLE */}

          <div className="catalogue-view-toggle">

            <button
              type="button"
              className={
                viewMode === 'grid'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setViewMode('grid')
              }
              aria-label="Grid view"
            >
              <FaThLarge />
            </button>


            <button
              type="button"
              className={
                viewMode === 'list'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setViewMode('list')
              }
              aria-label="List view"
            >
              <FaList />
            </button>

          </div>

        </div>

      </div>


      {/* =====================================================
          LOADING / EMPTY / DESIGNS
      ===================================================== */}

      {loading ? (

        <Loader label="Loading designs..." />

      ) : designs.length === 0 ? (

        <div className="empty-state">
          No designs found. Try a different search or category.
        </div>

      ) : (

        <>

          {/* =================================================
              DESIGN GRID / LIST
          ================================================= */}

          <div
            className={
              viewMode === 'grid'
                ? 'catalogue-grid'
                : 'catalogue-list'
            }
          >

            {designs.map((design) => (

              <Link
                key={design._id}
                to={`/design/${design._id}`}
                className="catalogue-card card premium-scene__item"
              >

                {/* ===========================================
                    BADGES
                =========================================== */}

                {design.isFeatured && (
                  <span className="catalogue-card-badge catalogue-card-badge-popular">
                    Popular
                  </span>
                )}

                {!design.isFeatured &&
                  isNew(design.createdAt) && (
                    <span className="catalogue-card-badge catalogue-card-badge-new">
                      New
                    </span>
                  )}


                {/* ===========================================
                    IMAGE
                =========================================== */}

                <div className="catalogue-card-image-wrapper">

                  <DesignPreviewImage
                    design={design}
                    alt={design.title}
                    loading="lazy"
                  />

                  <span className="catalogue-card-id">
                    #
                    {design._id
                      .slice(-6)
                      .toUpperCase()}
                  </span>

                </div>


                {/* ===========================================
                    CARD BODY
                =========================================== */}

                <div className="catalogue-card-body">

                  <p className="catalogue-card-meta">

                    {design.category?.name || 'Design'}

                    {design.sizeOptions?.length > 0 && (
                      <>
                        {' '}
                        &middot;{' '}
                        {design.sizeOptions
                          .slice(0, 2)
                          .join(' / ')}
                      </>
                    )}

                  </p>


                  <h3 className="catalogue-card-title">
                    {design.title}
                  </h3>


                  {design.description && (
                    <p className="catalogue-card-description">
                      {design.description}
                    </p>
                  )}


                  {/* =========================================
                      CARD FOOTER
                  ========================================= */}

                  <div className="catalogue-card-footer">

                    <div>

                      <span className="catalogue-card-price-label">
                        Est. Print Cost
                      </span>

                      <span className="catalogue-card-price">
                        From ₹{design.price || 0}
                      </span>

                    </div>


                    <span className="btn btn-primary catalogue-card-view-btn">
                      View
                      <FaArrowRight />
                    </span>

                  </div>

                </div>

              </Link>

            ))}

          </div>


          {/* =================================================
              PAGINATION
          ================================================= */}

          <CataloguePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(newPage) =>
              updateParams({
                page: newPage,
              })
            }
          />

        </>

      )}


      {/* =====================================================
          CUSTOM DTP CTA
      ===================================================== */}

      <div className="catalogue-cta card">

        <div>

          <span className="tag catalogue-cta-badge">
            Custom DTP Graphic Design Service
          </span>

          <h2 className="catalogue-cta-title">
            Can&apos;t find the exact design you need?
          </h2>

          <p className="catalogue-cta-text">
            Send your rough sketch, photos, or reference
            hoardings directly to our {BUSINESS.location}
            studio team. Our in-house artists will create
            an exclusive Telugu/English proof for you.
          </p>

        </div>


        {/* ===================================================
            CTA ACTIONS
        =================================================== */}

        <div className="catalogue-cta-actions">

          <a
            href={whatsappLinkWithMessage(
              "Hi, I couldn't find the exact design I need in your catalogue. I'd like to send a reference for a custom design."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <FaWhatsapp />
            Send Sample on WhatsApp
          </a>


          <a
            href={`tel:${BUSINESS.phone}`}
            className="btn btn-outline catalogue-cta-call"
          >
            <FaPhoneAlt />
            Call {BUSINESS.phone}
          </a>

        </div>

      </div>

    </div>
  );
};


export default Catalogue;