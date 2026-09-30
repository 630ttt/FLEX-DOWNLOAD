
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaCopy,
  FaPhoneAlt,
  FaCheckCircle,
  FaWhatsapp,
  FaShieldAlt,
  FaRulerCombined,
  FaTag,
  FaPrint,
  FaArrowRight,
  FaTimes,
  FaMagic,
} from "react-icons/fa";

import { api } from "../../api/client";
import {
  BUSINESS,
  whatsappLinkWithMessage,
  PRINT_SPECIFICATIONS,
  ORDER_ASSURANCES,
} from "../../constants/business";

import Loader from "../../components/Loader";
import DesignPreviewImage from "../../components/DesignPreviewImage";
import "./DesignDetails.css";

const DesignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Full-screen image viewer
  const [isImageOpen, setIsImageOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");

    api
      .get(`/designs/${id}`)
      .then((res) => setDesign(res.data))
      .catch(() => setError("Design not found"))
      .finally(() => setLoading(false));
  }, [id]);

  // Close image viewer with ESC
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsImageOpen(false);
      }
    };

    if (isImageOpen) {
      document.addEventListener("keydown", handleKeyDown);

      // Prevent background page scrolling
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isImageOpen]);

  if (loading) {
    return <Loader label="Loading design..." />;
  }

  if (error || !design) {
    return (
      <div className="design-details-error">
        <div className="design-error-card">
          <FaPrint />

          <h2>Design Not Found</h2>

          <p>
            {error || "The requested design could not be found."}
          </p>

          <Link to="/catalogue" className="design-error-btn">
            <FaArrowLeft />
            Back to Catalogue
          </Link>
        </div>
      </div>
    );
  }

  const shortId = design._id.slice(-6).toUpperCase();

  const handleCopyId = () => {
    navigator.clipboard?.writeText(shortId);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  const openImageViewer = () => {
    setIsImageOpen(true);
  };

  const closeImageViewer = () => {
    setIsImageOpen(false);
  };

  return (
    <main className="design-details-page design-details-page--premium">

      {/* =====================================================
          TOP NAVIGATION
      ===================================================== */}

      <div className="design-details-topbar">
        <nav className="design-details-breadcrumb">
          <Link to="/">Home</Link>

          <span>/</span>

          <Link to="/catalogue">Designs</Link>

          {design.category?.name && (
            <>
              <span>/</span>
              <span>{design.category.name}</span>
            </>
          )}

          <span>/</span>

          <strong>{shortId}</strong>
        </nav>

        <Link to="/catalogue" className="design-details-back">
          <FaArrowLeft />
          Back to Design Catalog
        </Link>
      </div>


      {/* =====================================================
          MAIN PRODUCT AREA
      ===================================================== */}

      <section className="design-details-showroom" aria-label="Design overview">

        <div className="design-showroom__hero">

        <div className="design-showroom__visual">

          <div className="design-details-image-card">

            <div className="design-details-image-header">
              <span>
                <FaPrint />
                Premium Print Design
              </span>

              <span className="design-details-id-badge">
                ID: {shortId}
              </span>
            </div>


            {/* CLICKABLE IMAGE */}

            <button
              type="button"
              className="design-details-image-click"
              onClick={openImageViewer}
              aria-label="View design image full screen"
            >
              <div className="design-details-image">

                <DesignPreviewImage
                  design={design}
                  fullSize
                  alt={design.title}
                  loading="eager"
                />

                <div className="design-details-hd-badge">
                  HD • 1440 DPI Ready
                </div>

                {/* IMAGE VIEW HINT */}

                <div className="design-image-click-hint">
                  Click to view full screen
                </div>

              </div>
            </button>


            <div className="design-details-image-footer">
              <span>
                <FaShieldAlt />
                High Quality Print Ready
              </span>

              <span>
                <FaCheckCircle />
                Production Ready
              </span>
            </div>

          </div>

        </div>


        <aside className="design-showroom__commerce design-details-info">

          <div className="design-details-info-inner">

            <div className="design-details-eyebrow">
              <span></span>

              {design.category?.name || "Premium"} Collection

              <span className="eyebrow-dot">
                •
              </span>

              {BUSINESS.location} Studio
            </div>


            <h1 className="design-details-title">
              {design.title}
            </h1>


            <div className="design-details-title-meta">
              Design ID: <strong>{shortId}</strong>
            </div>


            {design.description && (
              <p className="design-details-description">
                {design.description}
              </p>
            )}


            {/* =================================================
                COPY ID
            ================================================= */}

            <button
              type="button"
              className={`design-details-copy-btn ${
                copied ? "copied" : ""
              }`}
              onClick={handleCopyId}
            >
              <FaCopy />

              {copied
                ? "Design ID Copied!"
                : "Copy Design ID"}
            </button>


            {/* =================================================
                SIZE
            ================================================= */}

            {design.sizeOptions?.length > 0 && (
              <div className="design-details-option-section">

                <div className="design-option-heading">

                  <div>
                    <span>CHOOSE YOUR SIZE</span>
                    <h3>Available Sizes</h3>
                  </div>

                  <FaRulerCombined />

                </div>


                <div className="design-details-tags">

                  {design.sizeOptions.map((size) => (
                    <span
                      key={size}
                      className="design-size-tag"
                    >
                      {size}
                    </span>
                  ))}

                </div>

              </div>
            )}


            {/* =================================================
                PRICE
            ================================================= */}

            {design.price > 0 && (
              <div className="design-details-price-box">

                <div>

                  <span>STARTING PRICE</span>

                  <div className="design-details-price">
                    ₹{design.price}
                  </div>

                </div>


                {typeof design.orderCount === "number" &&
                  design.orderCount > 0 && (
                    <div className="design-details-order-count">

                      <strong>
                        {design.orderCount}+
                      </strong>

                      <span>
                        orders placed
                      </span>

                    </div>
                  )}

              </div>
            )}


            {/* =================================================
                DISPATCH
            ================================================= */}

            <div className="design-details-dispatch">

              <div className="dispatch-icon">
                <FaCheckCircle />
              </div>

              <div>

                <strong>
                  Ready for Production
                </strong>

                <span>
                  Printed &amp; dispatched from{" "}
                  {BUSINESS.address}
                </span>

              </div>

            </div>


            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="design-details-actions">

              <button
                type="button"
                className="design-details-order-btn"
                onClick={() =>
                  navigate(`/order/${design._id}`)
                }
              >
                <span>
                  Select &amp; Order This Design
                </span>

                <FaArrowRight />
              </button>

              <button
                type="button"
                className="design-ai-customize-btn"
                onClick={() => navigate('/editor')}
              >
                <FaMagic />
                Start Designing
              </button>



              <div className="design-secondary-actions">

                <a
                  href={`tel:${BUSINESS.phone}`}
                  className="design-call-btn"
                >
                  <FaPhoneAlt />
                  Call Designer
                </a>


                <a
                  href={whatsappLinkWithMessage(
                    `Hi, I'd like to ask about design ${shortId} (${design.title}).`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="design-whatsapp-btn"
                >
                  <FaWhatsapp />
                  WhatsApp Query
                </a>

              </div>

            </div>


            {/* =================================================
                TRUST MESSAGE
            ================================================= */}

            <div className="design-trust-box">

              <FaShieldAlt />

              <div>

                <strong>
                  Need help choosing?
                </strong>

                <p>
                  Our team can help you select the right
                  size, material and printing option for
                  your project.
                </p>

              </div>

            </div>

          </div>

        </aside>

        </div>


        <div className="design-showroom__details">

          <header className="design-showroom__details-head">
            <span>Product details</span>
            <h2>Print quality &amp; specifications</h2>
            <p>
              Everything you need to know before ordering — materials, resolution,
              and production standards from our {BUSINESS.location} studio.
            </p>
          </header>

          <div className="design-showroom__details-grid">

            {design.tags?.length > 0 && (
              <div className="design-details-panel design-showroom__panel">

                <div className="design-panel-heading">

                  <div className="design-panel-icon">
                    <FaTag />
                  </div>

                  <div>
                    <span>DESIGN CHARACTER</span>
                    <h3>Style Tags</h3>
                  </div>

                </div>

                <div className="design-details-tags">

                  {design.tags.map((tag) => (
                    <span
                      key={tag}
                      className="design-tag"
                    >
                      {tag}
                    </span>
                  ))}

                </div>

              </div>
            )}

            <div className="design-details-panel design-showroom__panel design-showroom__panel--specs">

              <div className="design-panel-heading">

                <div className="design-panel-icon">
                  <FaRulerCombined />
                </div>

                <div>
                  <span>PRINT INFORMATION</span>
                  <h3>Print Specifications</h3>
                </div>

              </div>

              <div className="design-details-specs-grid">

                {PRINT_SPECIFICATIONS.map((spec) => (
                  <div
                    key={spec.label}
                    className="design-spec-item"
                  >

                    <span className="design-details-specs-label">
                      {spec.label}
                    </span>

                    <strong className="design-details-specs-value">
                      {spec.value}
                    </strong>

                  </div>
                ))}

              </div>

            </div>

          </div>

          <div className="design-details-assurances design-showroom__assurances">

            {ORDER_ASSURANCES.map((item) => (
              <span
                key={item}
                className="design-details-assurance"
              >
                <FaCheckCircle />
                {item}
              </span>
            ))}

          </div>

        </div>

      </section>


      {/* =====================================================
          BOTTOM CTA
      ===================================================== */}

      <section className="design-bottom-cta">

        <div className="design-bottom-cta-content">

          <span>READY TO CREATE?</span>

          <h2>
            Turn this design into
            <strong> something remarkable.</strong>
          </h2>

          <p>
            Choose your preferred size and place your order,
            or speak with our team for a customised printing
            requirement.
          </p>


          <div className="design-bottom-actions">

            <button
              type="button"
              onClick={() =>
                navigate(`/order/${design._id}`)
              }
              className="bottom-order-btn"
            >
              Order This Design
              <FaArrowRight />
            </button>


            <a
              href={whatsappLinkWithMessage(
                `Hi, I'd like to enquire about design ${shortId} (${design.title}).`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="bottom-whatsapp-btn"
            >
              <FaWhatsapp />
              Talk to Us
            </a>

          </div>

        </div>


        <div className="design-bottom-decoration">

          <div className="design-decoration-circle circle-one"></div>

          <div className="design-decoration-circle circle-two"></div>

          <div className="design-decoration-yellow"></div>

        </div>

      </section>


      {/* =====================================================
          FULL SCREEN IMAGE VIEWER
      ===================================================== */}

      {isImageOpen && (
        <div
          className="design-fullscreen-viewer"
          onClick={closeImageViewer}
        >

          {/* CLOSE / X BUTTON */}

          <button
            type="button"
            className="design-fullscreen-close"
            onClick={(event) => {
              event.stopPropagation();
              closeImageViewer();
            }}
            aria-label="Close image viewer"
          >
            <FaTimes />
          </button>


          {/* LARGE IMAGE */}

          <div
            className="design-fullscreen-image-wrapper"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >

            <DesignPreviewImage
              design={design}
              fullSize
              alt={design.title}
              className="design-fullscreen-image"
            />

          </div>

        </div>
      )}

    </main>
  );
};

export default DesignDetails;
