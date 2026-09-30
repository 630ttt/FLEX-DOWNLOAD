import { Link } from "react-router-dom";
import {
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaInstagram,
  FaFacebookF,
  FaWhatsapp,
} from "react-icons/fa";

import { BUSINESS, WHATSAPP_LINK } from "../constants/business";
import BrandLogo from "./BrandLogo";
import "./Footer.css";

const FOOTER_COLUMNS = [
  {
    title: "Products",
    links: [
      { label: "Design Catalogue", to: "/catalogue" },
      { label: "Banners & Flex", to: "/catalogue" },
      { label: "Business Cards", to: "/catalogue" },
      { label: "Posters", to: "/catalogue" },
    ],
  },
  {
    title: "Templates",
    links: [
      { label: "Browse Templates", to: "/templates" },
      { label: "Weddings", to: "/templates?category=weddings" },
      { label: "Events", to: "/templates?category=events" },
      { label: "Business", to: "/templates?category=business" },
    ],
  },
  {
    title: "Business",
    links: [
      { label: "Solutions", to: "/solutions" },
      { label: "Pricing", to: "/pricing" },
      { label: "How It Works", to: "/how-it-works" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Design Tools",
    links: [
      { label: "Design Studio", to: "/editor" },
      { label: "Elements & Frames", to: "/editor" },
      { label: "Inspiration", to: "/inspiration" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "How It Works", to: "/how-it-works" },
      { label: "Track Orders", to: "/account" },
      { label: "Refund Policy", to: "/refund-policy" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help & Contact", to: "/contact" },
      { label: "Refund Policy", to: "/refund-policy" },
      { label: "Terms", to: "/terms-and-conditions" },
      { label: "Privacy", to: "/privacy-policy" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About YAMINI Flex", to: "/" },
      { label: "Account", to: "/account" },
      { label: "Login", to: "/login" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="footer footer--premium">
      <div className="footer-glow" aria-hidden="true" />
      <div className="premium-container footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <BrandLogo variant="light" className="footer-logo-mark" />
            </Link>
            <p className="footer-text">
              Premium flex printing, signage and large-format print for businesses, events, and celebrations across{" "}
              {BUSINESS.location}.
            </p>
            <div className="footer-social">
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <FaWhatsapp />
              </a>
              <a href="#" aria-label="Instagram" onClick={(e) => e.preventDefault()}>
                <FaInstagram />
              </a>
              <a href="#" aria-label="Facebook" onClick={(e) => e.preventDefault()}>
                <FaFacebookF />
              </a>
            </div>
          </div>

          <div className="footer-columns">
            {FOOTER_COLUMNS.map((col) => (
              <div className="footer-col" key={col.title}>
                <h4 className="footer-subtitle">{col.title}</h4>
                <ul className="footer-links">
                  {col.links.map((link) => (
                    <li key={`${col.title}-${link.label}`}>
                      <Link to={link.to} className="footer-link premium-link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="footer-cta-band">
          <p className="footer-cta-band__text">Your idea deserves a beautiful design.</p>
          <Link to="/editor" className="btn-premium btn-premium--primary">
            Start Designing
          </Link>
        </div>

        <div className="footer-contact-row">
          <a href={`tel:${BUSINESS.phone}`}>
            <FaPhoneAlt />
            {BUSINESS.phone}
          </a>
          <span>
            <FaMapMarkerAlt />
            {BUSINESS.address}
          </span>
        </div>

        <div className="footer-bottom">
          <p>Copyright © 2026 HRA Groups Private Limited. All Rights Reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/privacy-policy">Privacy</Link>
            <Link to="/terms-and-conditions">Terms</Link>
           
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
