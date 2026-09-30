
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import {
  FaUserCircle,
  FaSearch,
  FaBars,
  FaTimes,
} from "react-icons/fa";

import { useCustomerAuth } from "../context/CustomerAuthContext";
import BrandLogo from "./BrandLogo";
import ThemeToggle from "./ThemeToggle";

import "./Navbar.css";

const NAV_ITEMS = [
  { to: "/templates", label: "Templates" },
  { to: "/catalogue", label: "Designs" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/pricing", label: "Services" },
];

const Navbar = () => {
  const { isAuthenticated, customer } = useCustomerAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const navLinkClass = ({ isActive }) =>
    `navbar-link${isActive ? " navbar-link-active" : ""}`;

  const closeMenu = () => setMenuOpen(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const value = search.trim();
    navigate(`/catalogue${value ? `?search=${encodeURIComponent(value)}` : ""}`);
    closeMenu();
  };

  return (
    <header className={`navbar navbar--premium${scrolled ? " navbar--scrolled" : ""}${menuOpen ? " navbar--menu-open" : ""}`}>
      <div className="navbar-shell premium-container">
        <Link to="/" className="navbar-brand" onClick={closeMenu} aria-label="YAMINI Flex home">
          <BrandLogo variant="dark" className="navbar-brand-mark" />
        </Link>

        <nav className="navbar-navigation" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-main-actions">
          <form className="navbar-search-compact" onSubmit={handleSearchSubmit} role="search">
            <FaSearch aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designs…"
              aria-label="Search designs"
            />
          </form>

          <ThemeToggle />

          <NavLink to={isAuthenticated ? "/account" : "/login"} className="navbar-account">
            <FaUserCircle />
            <span>{isAuthenticated ? customer?.name?.split(" ")[0] || "Account" : "Login"}</span>
          </NavLink>

          <button
            type="button"
            className="navbar-menu-button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      <div
        className={`navbar-mobile${menuOpen ? " navbar-mobile-open" : ""}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="navbar-mobile-panel">
          <form className="navbar-mobile-search" onSubmit={handleSearchSubmit}>
            <FaSearch />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products & templates"
              aria-label="Search"
            />
          </form>

          <nav className="navbar-mobile-navigation">
            <NavLink to="/" end className={navLinkClass} onClick={closeMenu}>
              Home
            </NavLink>
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={closeMenu}>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/contact" className={navLinkClass} onClick={closeMenu}>
              Contact
            </NavLink>
          </nav>

          <div className="navbar-mobile-actions">
            <NavLink
              to={isAuthenticated ? "/account" : "/login"}
              className="btn-premium btn-premium--ghost"
              onClick={closeMenu}
            >
              {isAuthenticated ? "My Account" : "Login"}
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
