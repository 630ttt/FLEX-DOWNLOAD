
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  FaArrowRight,
  FaSearch,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaBaby,
  FaBullhorn,
  FaBriefcase,
  FaClock,
  FaChevronLeft,
  FaChevronRight,
  FaPrint,
} from 'react-icons/fa';

import { api } from '../../api/client';

import {
  BUSINESS,
  HERO_STATS,
  HERO_HIGHLIGHTS,
  SERVICE_DETAILS,
  UNIT_LABELS,
  RATE_CARD_MATERIALS,
  TRENDING_SEARCHES,
  HOW_IT_WORKS,
  WHY_CHOOSE_US,
} from '../../constants/business';

import Loader from '../../components/Loader';
import DesignPreviewImage from '../../components/DesignPreviewImage';
import { getDesignImageUrl } from '../../utils/designAssets';
import PremiumHero from '../../components/premium/PremiumHero';
import EditorialTemplateRail from '../../components/premium/EditorialTemplateRail';
import PhysicalTemplateShowcase from '../../components/premium/PhysicalTemplateShowcase';
import DesignStudioFeature from '../../components/premium/DesignStudioFeature';
import ProductShowcase from '../../components/premium/ProductShowcase';
import DesignGallery from '../../components/premium/DesignGallery';
import StatsSection from '../../components/premium/StatsSection';
import ProcessTimeline from '../../components/premium/ProcessTimeline';
import CtaBanner from '../../components/premium/CtaBanner';

import './Home.css';


/* =========================================================
   API IMAGE HELPER
   ========================================================= */

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace('/api', '');


const resolveImage = (src) => {
  if (!src) return '';

  if (src.startsWith('http')) {
    return src;
  }

  if (src.startsWith('/')) {
    return `${API_ORIGIN}${src}`;
  }

  return `${API_ORIGIN}/${src}`;
};


/* =========================================================
   DESIGN DATA NORMALIZER
   Supports different backend response structures.
   ========================================================= */

const getDesignArray = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.designs)) {
    return data.designs;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
};


/* =========================================================
   GET DESIGN IMAGE
   Supports:
   - thumbnail
   - image
   - imageUrl
   - images[]
   - image[]
   ========================================================= */

const getDesignImage = (design) => {
  if (!design) return '';

  if (design.previewImage || design.thumbnail || design.fullImage || design.fileType) {
    return getDesignImageUrl(design);
  }

  if (design.image) {
    return resolveImage(design.image);
  }

  if (design.imageUrl) {
    return resolveImage(design.imageUrl);
  }

  if (Array.isArray(design.images)) {
    const firstImage = design.images.find(Boolean);

    if (typeof firstImage === 'string') {
      return resolveImage(firstImage);
    }

    if (firstImage?.url) {
      return resolveImage(firstImage.url);
    }

    if (firstImage?.path) {
      return resolveImage(firstImage.path);
    }
  }

  if (Array.isArray(design.image)) {
    const firstImage = design.image.find(Boolean);

    if (typeof firstImage === 'string') {
      return resolveImage(firstImage);
    }

    if (firstImage?.url) {
      return resolveImage(firstImage.url);
    }

    if (firstImage?.path) {
      return resolveImage(firstImage.path);
    }
  }

  return '';
};


/* =========================================================
   CATEGORY MATCHING HELPERS
   ========================================================= */

const normalizeText = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
};


const getCategoryReference = (category) => {
  if (!category) return '';

  return (
    category._id ||
    category.id ||
    category.slug ||
    category.name ||
    ''
  );
};


const getDesignCategoryValues = (design) => {
  const values = [];

  const category = design?.category;

  if (typeof category === 'string') {
    values.push(category);
  }

  if (category?._id) {
    values.push(category._id);
  }

  if (category?.id) {
    values.push(category.id);
  }

  if (category?.name) {
    values.push(category.name);
  }

  if (category?.slug) {
    values.push(category.slug);
  }

  if (design?.categoryId) {
    values.push(design.categoryId);
  }

  if (design?.categoryName) {
    values.push(design.categoryName);
  }

  if (design?.categorySlug) {
    values.push(design.categorySlug);
  }

  return values.filter(Boolean);
};


const designBelongsToCategory = (
  design,
  category
) => {
  const categoryReference =
    getCategoryReference(category);

  const categoryName =
    category?.name || '';

  const categorySlug =
    category?.slug || '';

  const designCategoryValues =
    getDesignCategoryValues(design);

  if (!designCategoryValues.length) {
    return false;
  }

  const targetValues = [
    categoryReference,
    categoryName,
    categorySlug,
  ]
    .filter(Boolean)
    .map(normalizeText);

  return designCategoryValues.some(
    (value) =>
      targetValues.includes(
        normalizeText(value)
      )
  );
};


/* =========================================================
   HERO SLIDES
   ========================================================= */

const HERO_SLIDES = [
  {
    id: 1,
    image:
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1920&q=80',
    eyebrow: 'Premium Flex Printing',
    title: 'Prints That Make Your Brand Stand Out.',
    description:
      'High-quality flex, vinyl, signage and promotional printing crafted for businesses, events and celebrations.',
    primary: 'Browse Designs',
    secondary: 'Contact Us',
  },

  {
    id: 2,
    image:
      'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=1920&q=80',
    eyebrow: 'Professional Print Solutions',
    title: 'Big Ideas. Bigger Prints.',
    description:
      'From event banners and hoardings to shop branding and promotional displays, we turn your designs into high-impact prints.',
    primary: 'Explore Services',
    secondary: 'View Designs',
  },

  {
    id: 3,
    image:
      'https://images.unsplash.com/photo-1614036634955-ae5e90f9b9eb?auto=format&fit=crop&w=1920&q=80',
    eyebrow: 'Made For Every Occasion',
    title: 'Celebrate. Promote. Make An Impact.',
    description:
      'Professional printing for birthdays, weddings, political campaigns, business promotions, religious events and more.',
    primary: 'View Designs',
    secondary: 'Contact Us',
  },

  {
    id: 4,
    image:
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1920&q=80',
    eyebrow: 'Yamini Flex Printing',
    title: 'Your Design. Our Printing Expertise.',
    description:
      'Reliable printing, sharp colours and professional finishing for every project, from small displays to large-format branding.',
    primary: 'Start Your Order',
    secondary: 'Contact Us',
  },
];


/* =========================================================
   DESIGN PREVIEW CARD
   ========================================================= */

const DesignPreviewCard = ({
  design,
  badge,
}) => {
  const image = getDesignImage(design);

  return (
    <div className="preview-card card">

      {badge && (
        <span
          className={`preview-card-badge preview-card-badge-${badge
            .toLowerCase()
            .replace(/\s+/g, '-')}`}
        >
          {badge}
        </span>
      )}

      <div className="preview-card-image-wrapper">

        {image ? (
          <DesignPreviewImage
            design={design}
            src={image}
            alt={
              design.title ||
              'Yamini Flex Printing design'
            }
            loading="lazy"
          />
        ) : (
          <div className="preview-card-image-fallback">
            <FaPrint />
          </div>
        )}

      </div>

      <div className="preview-card-body">

        {design.category?.name && (
          <span className="preview-card-category">
            {design.category.name}
          </span>
        )}

        {design.categoryName && (
          <span className="preview-card-category">
            {design.categoryName}
          </span>
        )}

        <h3 className="preview-card-title">
          {design.title ||
            design.name ||
            'Premium Print Design'}
        </h3>

        {design.description && (
          <p className="preview-card-description">
            {design.description}
          </p>
        )}

        <div className="preview-card-footer">

          <span className="tag">
            HD Print Ready
          </span>

          <Link
            to={`/design/${design._id}`}
            className="btn btn-primary preview-card-btn"
          >
            View Design
          </Link>

        </div>

      </div>

    </div>
  );
};


/* =========================================================
   HOME
   ========================================================= */

const Home = () => {
  const navigate = useNavigate();


  /* =======================================================
     HERO
     ======================================================= */

  const [currentSlide, setCurrentSlide] =
    useState(0);


  /* =======================================================
     FINDER
     ======================================================= */

  const [finderSearch, setFinderSearch] =
    useState('');


  /* =======================================================
     CATEGORIES
     ======================================================= */

  const [categories, setCategories] =
    useState([]);

  const [categoriesLoading, setCategoriesLoading] =
    useState(true);


  /* =======================================================
     ALL DESIGNS
     Used for category sample images.
     ======================================================= */

  const [allDesigns, setAllDesigns] =
    useState([]);


  /* =======================================================
     LATEST / POPULAR
     ======================================================= */

  const [latestDesigns, setLatestDesigns] =
    useState([]);

  const [popularDesigns, setPopularDesigns] =
    useState([]);

  const [designsLoading, setDesignsLoading] =
    useState(true);


  /* =======================================================
     CALCULATOR
     ======================================================= */

  const [calc, setCalc] = useState({
    width: 10,
    height: 6,
    materialIndex: 1,
    name: '',
    phone: '',
  });


  /* =======================================================
     HERO AUTO SLIDER
     ======================================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(
        (prev) =>
          (prev + 1) %
          HERO_SLIDES.length
      );
    }, 4500);

    return () => clearInterval(timer);
  }, []);


  /* =======================================================
     LOAD CATEGORIES
     ======================================================= */

  useEffect(() => {
    setCategoriesLoading(true);

    api
      .get('/categories')
      .then((res) => {

        const categoryData =
          Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.categories)
            ? res.data.categories
            : Array.isArray(res?.data?.data)
            ? res.data.data
            : [];

        setCategories(categoryData);
      })
      .catch(() => {
        setCategories([]);
      })
      .finally(() => {
        setCategoriesLoading(false);
      });
  }, []);


  /* =======================================================
     LOAD DESIGNS
     One larger request is used so categories can show
     relevant sample designs.
     ======================================================= */

  useEffect(() => {

    setDesignsLoading(true);

    Promise.all([
      api.get('/designs', {
        page: 1,
        limit: 100,
      }),

      api.get('/designs', {
        page: 1,
        limit: 4,
      }),

      api.get('/designs', {
        page: 1,
        limit: 4,
        featured: 'true',
      }),
    ])
      .then(
        ([
          allDesignsRes,
          latestRes,
          featuredRes,
        ]) => {

          const all =
            getDesignArray(
              allDesignsRes
            );

          const latest =
            getDesignArray(
              latestRes
            );

          let popular =
            getDesignArray(
              featuredRes
            );


          setAllDesigns(all);


          setLatestDesigns(
            latest
          );


          /* =============================================
             POPULAR FALLBACK
             ============================================= */

          if (popular.length < 4) {

            const usedIds =
              new Set([
                ...latest.map(
                  (design) =>
                    design._id
                ),

                ...popular.map(
                  (design) =>
                    design._id
                ),
              ]);

            const fallback =
              all.filter(
                (design) =>
                  !usedIds.has(
                    design._id
                  )
              );

            popular = [
              ...popular,
              ...fallback,
            ].slice(0, 4);


            if (
              popular.length === 0
            ) {
              popular =
                latest.slice(0, 4);
            }
          }


          setPopularDesigns(
            popular
          );
        }
      )
      .catch(() => {
        setAllDesigns([]);
        setLatestDesigns([]);
        setPopularDesigns([]);
      })
      .finally(() => {
        setDesignsLoading(false);
      });

  }, []);


  /* =======================================================
     CATEGORY SAMPLE DESIGNS
     Automatically selects one relevant design per category.
     ======================================================= */

  const categoryDesignMap = useMemo(() => {

    const map = {};

    categories.forEach((category) => {

      const matchingDesign =
        allDesigns.find(
          (design) =>
            designBelongsToCategory(
              design,
              category
            ) &&
            getDesignImage(
              design
            )
        );

      if (matchingDesign) {
        map[
          getCategoryReference(
            category
          )
        ] = matchingDesign;
      }

    });

    return map;

  }, [categories, allDesigns]);

  const fallbackCategoryDesigns = useMemo(
    () => allDesigns.filter((design) => getDesignImage(design)),
    [allDesigns]
  );


  /* =======================================================
     CALCULATOR
     ======================================================= */

  const material =
    RATE_CARD_MATERIALS[
      calc.materialIndex
    ] ||
    RATE_CARD_MATERIALS[0];


  const totalArea = useMemo(() => {

    return (
      (Number(calc.width) || 0) *
      (Number(calc.height) || 0)
    );

  }, [
    calc.width,
    calc.height,
  ]);


  const estimatedRate = useMemo(() => {

    return Math.round(
      totalArea *
        (material?.price || 0)
    );

  }, [
    totalArea,
    material,
  ]);


  /* =======================================================
     FINDER
     ======================================================= */

  const handleFinderSubmit = (e) => {

    e.preventDefault();

    const search =
      finderSearch.trim();

    navigate(
      `/catalogue${
        search
          ? `?search=${encodeURIComponent(
              search
            )}`
          : ''
      }`
    );
  };


  /* =======================================================
     CALCULATOR CHANGE
     ======================================================= */

  const handleCalcChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setCalc((prev) => ({
      ...prev,

      [name]:
        name === 'materialIndex'
          ? Number(value)
          : value,
    }));
  };


  /* =======================================================
     HERO NAVIGATION
     ======================================================= */

  const goToPreviousSlide = () => {

    setCurrentSlide(
      (prev) =>
        (prev - 1 +
          HERO_SLIDES.length) %
        HERO_SLIDES.length
    );
  };


  const goToNextSlide = () => {

    setCurrentSlide(
      (prev) =>
        (prev + 1) %
        HERO_SLIDES.length
    );
  };

  const galleryDesigns = useMemo(
    () =>
      [...latestDesigns, ...popularDesigns].map((design) => ({
        title: design.title || design.name,
        imageUrl: getDesignImage(design),
      })),
    [latestDesigns, popularDesigns]
  );

  const heroPrintDesign =
    allDesigns.find(
      (design) => normalizeText(design.category?.name) === 'birthday design' && getDesignImage(design)
    ) || allDesigns.find((design) => getDesignImage(design));

  const heroPrintImage = getDesignImage(heroPrintDesign);

  return (
    <div className="home-premium">

      <PremiumHero printDesignImage={heroPrintImage} />
      <ProductShowcase />

      {/* Legacy hero slider retained in code for reference — replaced by premium hero */}
      <section className="hero hero-slider home-premium__legacy-hero" hidden aria-hidden="true">

        <div className="hero-slider-track">

          {HERO_SLIDES.map(
            (slide, index) => (

              <div
                key={slide.id}
                className={`hero-slide ${
                  index === currentSlide
                    ? 'active'
                    : ''
                }`}
                aria-hidden={
                  index !== currentSlide
                }
              >

                <img
                  src={slide.image}
                  alt={slide.title}
                  className="hero-slide-image"
                  loading={
                    index === 0
                      ? 'eager'
                      : 'lazy'
                  }
                  fetchPriority={
                    index === 0
                      ? 'high'
                      : 'auto'
                  }
                />

                <div className="hero-slide-overlay" />

                <div className="hero-slide-container">

                  <div className="hero-slide-content">

                    <span className="hero-slide-eyebrow">

                      <span className="hero-slide-eyebrow-line" />

                      {slide.eyebrow}

                    </span>


                    <h1 className="hero-slide-title">
                      {slide.title}
                    </h1>


                    <p className="hero-slide-description">
                      {slide.description}
                    </p>


                    <div className="hero-slide-actions">

                      <Link
                        to="/catalogue"
                        className="hero-slide-btn hero-slide-btn-primary"
                      >
                        {slide.primary}

                        <FaArrowRight />

                      </Link>


                      <Link
                        to="/contact"
                        className="hero-slide-btn hero-slide-btn-secondary"
                      >

                        {slide.secondary}

                        <FaArrowRight />

                      </Link>

                    </div>


                    <div className="hero-slide-trust">

                      <span>
                        ✓ High-Resolution Printing
                      </span>

                      <span>
                        ✓ Professional Finishing
                      </span>

                      <span>
                        ✓ Fast Turnaround
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            )
          )}

        </div>


        <button
          type="button"
          className="hero-slider-arrow hero-slider-arrow-left"
          aria-label="Previous slide"
          onClick={goToPreviousSlide}
        >
          <FaChevronLeft />
        </button>


        <button
          type="button"
          className="hero-slider-arrow hero-slider-arrow-right"
          aria-label="Next slide"
          onClick={goToNextSlide}
        >
          <FaChevronRight />
        </button>


        <div className="hero-slider-dots">

          {HERO_SLIDES.map(
            (slide, index) => (

              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${
                  index + 1
                }`}
                className={`hero-slider-dot ${
                  index === currentSlide
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setCurrentSlide(
                    index
                  )
                }
              />

            )
          )}

        </div>


        <div className="hero-slider-bottom">

          <div className="hero-slider-bottom-inner">

            <span>
              <FaPrint />
              Premium Flex Printing
            </span>

            <span>
              <FaBriefcase />
              Business Branding
            </span>

            <span>
              <FaCalendarAlt />
              Event Printing
            </span>

            <span>
              <FaBullhorn />
              Promotional Displays
            </span>

          </div>

        </div>

      </section>


      {/* =================================================
          SERVICES
      ================================================= */}

      <section className="services-section">

        <div className="page-container">

          <span className="eyebrow">
            Atelier Solutions
          </span>

          <div className="section-header-row">

            <div>

              <h2>
                Our Printing Services
              </h2>

              <p>
                State-of-the-art print solutions for
                businesses, events, and personal
                celebrations with precision color
                calibration.
              </p>

            </div>

          </div>


          <div className="services-grid">

            {SERVICE_DETAILS.map(
              (service) => (

                <div
                  key={service.name}
                  className="service-card card"
                >

                  {service.icon && (
                    <div className="service-card-icon">
                      {service.icon}
                    </div>
                  )}

                  <h3>
                    {service.name}
                  </h3>

                  <span className="service-card-tagline">
                    {service.tagline}
                  </span>

                  <p>
                    {service.description}
                  </p>

                  <div className="service-card-footer">

                    <span className="service-card-price">

                      From ₹
                      {service.price}{' '}
                      {UNIT_LABELS[
                        service.unit
                      ]}

                    </span>

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </section>


      {/* =================================================
          FINDER
      ================================================= */}

      <section className="finder-section">

        <div className="page-container">

          <span className="eyebrow">
            Instant Catalog Finder
          </span>

          <h2>
            Find Your Design Fast
          </h2>

          <p>
            Enter your required event, design code,
            or template style to preview and place
            an immediate print request.
          </p>


          <form
            className="finder-search"
            onSubmit={handleFinderSubmit}
          >

            <FaSearch className="finder-search-icon" />

            <input
              type="text"
              placeholder="Search by Design ID, Name or Category..."
              value={finderSearch}
              onChange={(e) =>
                setFinderSearch(
                  e.target.value
                )
              }
            />

            <button type="submit">
              <FaArrowRight />
            </button>

          </form>


          <div className="finder-suggestions">

            {TRENDING_SEARCHES.map(
              (term) => (

                <button
                  key={term}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/catalogue?search=${encodeURIComponent(
                        term
                      )}`
                    )
                  }
                >
                  {term}
                </button>

              )
            )}

          </div>

        </div>

      </section>


      {/* =================================================
          ORGANIZED COLLECTIONS
          IMAGE-BASED CATEGORY SECTION
      ================================================= */}

      <section className="categories-section">

        <div className="page-container">

          <div className="categories-heading">

            <span className="eyebrow">
              Organized Collections
            </span>

            <h2 className="section-title">
              Browse Design Categories
            </h2>

            <p className="section-subtitle">
              Explore professionally curated printing
              collections with a relevant sample design
              for every category.
            </p>

          </div>


          {categoriesLoading ? (

            <Loader label="Loading categories..." />

          ) : categories.length === 0 ? (

            <div className="empty-state premium-empty-state">
              <p>No categories available yet.</p>
              <Link to="/catalogue" className="btn-premium btn-premium--primary">Browse catalogue</Link>
            </div>

          ) : (

            <div className="category-image-grid">

              {categories.map(
                (category, categoryIndex) => {

                  const categoryReference =
                    getCategoryReference(
                      category
                    );

                  const matchingDesign =
                    categoryDesignMap[
                      categoryReference
                    ];

                  const fallbackDesign =
                    fallbackCategoryDesigns.length
                      ? fallbackCategoryDesigns[
                          categoryIndex % fallbackCategoryDesigns.length
                        ]
                      : undefined;

                  const sampleDesign =
                    matchingDesign || fallbackDesign;

                  const sampleImage =
                    category.image
                      ? resolveImage(category.image)
                      : getDesignImage(sampleDesign);

                  return (
                    <Link
                      key={
                        category._id ||
                        category.id ||
                        category.slug ||
                        category.name
                      }
                      to={`/catalogue?category=${
                        category._id ||
                        category.id ||
                        category.slug ||
                        ''
                      }`}
                      className="category-image-card"
                    >

                      {/* IMAGE */}

                      <div className="category-image-wrapper">

                        <DesignPreviewImage
                          design={sampleDesign}
                          src={sampleImage || undefined}
                          alt={`${category.name} flex printing design`}
                          className="category-image"
                          loading="lazy"
                        />


                      </div>


                      {/* CONTENT */}

                      <div className="category-image-content">

                        <div>

                          <h3>
                            {category.name}
                          </h3>

                          <span>
                            {category.designCount ||
                            sampleDesign
                              ? `${
                                  category.designCount ||
                                  'Available'
                                } ${
                                  typeof category.designCount ===
                                  'number'
                                    ? 'Designs'
                                    : ''
                                }`
                              : 'Explore Designs'}
                          </span>

                        </div>


                        <span className="category-explore">
                          Explore
                          <FaArrowRight />
                        </span>

                      </div>

                    </Link>
                  );
                }
              )}

            </div>

          )}


          <div className="category-cta">

            <Link
              to="/catalogue"
              className="btn btn-primary"
            >
              View All Designs
              <FaArrowRight />
            </Link>

          </div>

        </div>

      </section>


      {/* =================================================
          LATEST DESIGNS
      ================================================= */}

      <section className="designs-section">

        <div className="page-container">

          <div className="section-header-row">

            <div>

              <span className="eyebrow">
                Fresh Creations
              </span>

              <h2 className="section-title">
                Latest Designs
              </h2>

              <p className="section-subtitle">
                Recently created custom flex print
                templates crafted for local celebrations.
              </p>

            </div>

          </div>


          {designsLoading ? (

            <Loader label="Loading designs..." />

          ) : latestDesigns.length === 0 ? (

            <div className="empty-state premium-empty-state">
              <p>No designs yet — create your first design in the studio.</p>
              <Link to="/editor" className="btn-premium btn-premium--primary">Create Design</Link>
            </div>

          ) : (

            <div className="preview-grid">

              {latestDesigns.map(
                (design) => (

                  <DesignPreviewCard
                    key={design._id}
                    design={design}
                  />

                )
              )}

            </div>

          )}

        </div>

      </section>


      {/* =================================================
          POPULAR DESIGNS
      ================================================= */}

      <section className="designs-section popular-designs-section">

        <div className="page-container">

          <div className="section-header-row">

            <div>

              <span className="eyebrow">
                Trending Now
              </span>

              <h2 className="section-title">
                Popular Designs
              </h2>

              <p className="section-subtitle">
                Most ordered and trending flex print
                layouts with proven crowd impact.
              </p>

            </div>

          </div>


          {designsLoading ? (

            <Loader label="Loading designs..." />

          ) : popularDesigns.length === 0 ? (

            <div className="empty-state premium-empty-state">
              <p>No popular designs yet. Explore the catalogue.</p>
              <Link to="/catalogue" className="btn-premium btn-premium--ghost">View catalogue</Link>
            </div>

          ) : (

            <div className="preview-grid">

              {popularDesigns.map(
                (design) => (

                  <DesignPreviewCard
                    key={design._id}
                    design={design}
                    badge={
                      design.isFeatured
                        ? 'Popular'
                        : undefined
                    }
                  />

                )
              )}

            </div>

          )}

        </div>

      </section>

      <DesignGallery apiDesigns={galleryDesigns} />
      <EditorialTemplateRail />
      <PhysicalTemplateShowcase />
      <DesignStudioFeature />
      <StatsSection />
      <ProcessTimeline />


      {/* =================================================
          WHY CHOOSE US
      ================================================= */}

      <section className="why-section">

        <div className="page-container">

          <span className="eyebrow">
            The Yamini Advantage
          </span>

          <h2 className="section-title">
            Why Choose {BUSINESS.name}?
          </h2>

          <p className="section-subtitle">
            Combining regional cultural understanding
            with high-speed professional printing
            infrastructure.
          </p>


          <div className="why-grid">

            {WHY_CHOOSE_US.map(
              (item) => (

                <div
                  key={item.title}
                  className="why-card card"
                >

                  {item.icon && (
                    <div className="why-card-icon">
                      {item.icon}
                    </div>
                  )}

                  <h3>
                    {item.title}
                  </h3>

                  <p>
                    {item.description}
                  </p>

                </div>

              )
            )}

          </div>

        </div>

      </section>

      <CtaBanner />

      {/* =================================================
          CONTACT + RATE CALCULATOR
      ================================================= */}

      <section className="contact-section">

        <div className="page-container">

          <div className="contact-banner">

            <div className="contact-content">

              <span className="eyebrow">
                Visit Our Studio
              </span>

              <h2>
                Get In Touch & Visit Our Studio
              </h2>

              <p>
                Experience high-definition finishing
                close up, inspect substrate swatches,
                or pick up your finished hoardings
                right at our print facility.
              </p>


              <div className="contact-details">

                <div className="contact-detail">

                  <FaMapMarkerAlt />

                  <span>
                    {BUSINESS.name} —{' '}
                    {BUSINESS.fullAddress}
                  </span>

                </div>


                <div className="contact-detail">

                  <FaPhoneAlt />

                  <span>
                    Customer Hotline:{' '}
                    {BUSINESS.phone}
                  </span>

                </div>


                <div className="contact-detail">

                  <FaClock />

                  <span>
                    {BUSINESS.workingHours}
                  </span>

                </div>

              </div>


              {/* CONTACT ACTIONS */}

              <div className="contact-actions">

                <a
                  href={`tel:${BUSINESS.phone}`}
                  className="btn btn-outline"
                >
                  <FaPhoneAlt />
                  Call Now
                </a>


                <Link
                  to="/contact"
                  className="btn btn-primary"
                >
                  Contact Us
                  <FaArrowRight />
                </Link>


                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    BUSINESS.fullAddress
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-gold"
                >
                  <FaMapMarkerAlt />
                  Get Directions
                </a>

              </div>

            </div>


            {/* =================================================
                RATE CALCULATOR
            ================================================= */}

            <div className="rate-calculator card">

              <h3>
                Quick Rate Calculator
              </h3>

              <p>
                Select your flex dimensions and
                material substrate to calculate
                estimated square footage and price
                instantly.
              </p>


              <div className="order-form-row">

                <div className="form-group">

                  <label className="form-label">
                    Width (Feet)
                  </label>

                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    name="width"
                    value={calc.width}
                    onChange={handleCalcChange}
                  />

                </div>


                <div className="form-group">

                  <label className="form-label">
                    Height (Feet)
                  </label>

                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    name="height"
                    value={calc.height}
                    onChange={handleCalcChange}
                  />

                </div>

              </div>


              <div className="form-group">

                <label className="form-label">
                  Material Substrate
                </label>

                <select
                  className="form-select"
                  name="materialIndex"
                  value={calc.materialIndex}
                  onChange={handleCalcChange}
                >

                  {RATE_CARD_MATERIALS.map(
                    (mat, index) => (

                      <option
                        key={mat.name}
                        value={index}
                      >
                        {mat.name} (₹
                        {mat.price} / sq.ft)
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="order-form-row">

                <div className="form-group">

                  <label className="form-label">
                    Your Name
                  </label>

                  <input
                    className="form-input"
                    name="name"
                    placeholder="e.g. Ramesh"
                    value={calc.name}
                    onChange={handleCalcChange}
                  />

                </div>


                <div className="form-group">

                  <label className="form-label">
                    Mobile Number
                  </label>

                  <input
                    className="form-input"
                    name="phone"
                    placeholder="9XXXXXXXXX"
                    value={calc.phone}
                    onChange={handleCalcChange}
                  />

                </div>

              </div>


              {/* RATE RESULT */}

              <div className="rate-result">

                <div>

                  <span className="rate-result-label">
                    Total Area
                  </span>

                  <span className="rate-result-value">
                    {totalArea} sq.ft
                  </span>

                </div>


                <div>

                  <span className="rate-result-label">
                    Estimated Rate
                  </span>

                  <span className="rate-result-value">
                    ₹{estimatedRate} approx
                  </span>

                </div>


                <span className="rate-result-note">
                  Final pricing may vary based on
                  finishing, quantity and installation
                  requirements.
                </span>

              </div>


              {/* QUOTE ACTION */}

              


              <p>
                Custom metal framing & site
                installation available in{' '}
                {BUSINESS.location}.
              </p>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
};


export default Home;

