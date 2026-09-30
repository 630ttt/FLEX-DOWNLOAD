import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaWhatsapp,
  FaClock,
  FaArrowRight,
  FaPrint,
  FaEnvelope,
} from "react-icons/fa";

import { BUSINESS, WHATSAPP_LINK } from "../../constants/business";

import "./Contact.css";

const Contact = () => {
  return (
    <main className="contact-page">
      {/* =========================
          HERO SECTION
      ========================= */}
      <section className="contact-hero">
        <div className="contact-hero-content">
          <span className="contact-eyebrow">
            <FaPrint />
            YAMINI FLEX PRINTING
          </span>

          <h1>
            Let’s Bring Your
            <span> Ideas to Life.</span>
          </h1>

          <p>
            Have a printing requirement, custom design, or project in mind?
            Talk to our team and let’s create something that makes an impact.
          </p>

          <div className="contact-hero-actions">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-primary-btn"
            >
              <FaWhatsapp />
              Chat on WhatsApp
              <FaArrowRight />
            </a>

            <a href={`tel:${BUSINESS.phone}`} className="contact-secondary-btn">
              <FaPhoneAlt />
              Call Us
            </a>
          </div>
        </div>

        <div className="contact-hero-decoration">
          <div className="contact-yellow-circle"></div>

          <div className="contact-print-card">
            <FaPrint />
            <strong>Professional</strong>
            <span>Printing Solutions</span>
          </div>

          <div className="contact-floating-box box-one">
            <span>✓</span>
            Quality Printing
          </div>

          <div className="contact-floating-box box-two">
            <span>★</span>
            Fast Response
          </div>
        </div>
      </section>

      {/* =========================
          CONTACT INFORMATION
      ========================= */}
      <section className="contact-information">
        <div className="contact-section-heading">
          <span>CONTACT INFORMATION</span>
          <h2>We’re Here to Help</h2>
          <p>
            Reach out to us for printing enquiries, quotations, designs, or
            project discussions.
          </p>
        </div>

        <div className="contact-grid">
          {/* Address */}
          <div className="contact-info-card">
            <div className="contact-icon">
              <FaMapMarkerAlt />
            </div>

            <div>
              <span className="contact-card-label">VISIT US</span>
              <h3>Our Location</h3>
              <p>{BUSINESS.address}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="contact-info-card">
            <div className="contact-icon">
              <FaPhoneAlt />
            </div>

            <div>
              <span className="contact-card-label">CALL US</span>
              <h3>Phone</h3>
              <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phone}</a>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="contact-info-card highlight-card">
            <div className="contact-icon whatsapp-icon">
              <FaWhatsapp />
            </div>

            <div>
              <span className="contact-card-label">MESSAGE US</span>
              <h3>WhatsApp</h3>

              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                Start a conversation
              </a>
            </div>

            <FaArrowRight className="card-arrow" />
          </div>

          {/* Email */}
          <div className="contact-info-card">
            <div className="contact-icon">
              <FaEnvelope />
            </div>

            <div>
              <span className="contact-card-label">ENQUIRIES</span>
              <h3>Project Enquiries</h3>
              <p>
                Contact us for custom printing requirements and quotations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          BUSINESS HOURS
      ========================= */}
      <section className="contact-hours-section">
        <div className="contact-hours-content">
          <div className="hours-icon">
            <FaClock />
          </div>

          <div>
            <span>WHEN YOU CAN REACH US</span>
            <h2>Business Hours</h2>
            <p>
              Our team is available to discuss your printing requirements,
              answer questions, and help you get started.
            </p>
          </div>
        </div>

        <div className="business-hours">
          <div>
            <strong>Monday – Saturday</strong>
            <span>9:30 AM – 6:30 PM</span>
          </div>

          <div className="hours-divider"></div>

          <div>
            <strong>Sunday</strong>
            <span>Closed</span>
          </div>
        </div>
      </section>

      {/* =========================
          CTA
      ========================= */}
      <section className="contact-cta">
        <div className="contact-cta-content">
          <span>READY TO PRINT?</span>

          <h2>
            Have a project
            <br />
            <strong>in mind?</strong>
          </h2>

          <p>
            Share your requirements with us and let’s turn your idea into
            high-quality printed material.
          </p>

          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-whatsapp-btn"
          >
            <FaWhatsapp />
            Get Started on WhatsApp
            <FaArrowRight />
          </a>
        </div>

        <div className="cta-decoration">
          <div className="cta-ring ring-one"></div>
          <div className="cta-ring ring-two"></div>
          <div className="cta-yellow-shape"></div>
        </div>
      </section>
    </main>
  );
};

export default Contact;