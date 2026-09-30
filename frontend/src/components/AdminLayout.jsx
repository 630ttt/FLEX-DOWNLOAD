import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaChartLine,
  FaImages,
  FaThLarge,
  FaClipboardList,
  FaUsers,
  FaSignOutAlt,
  FaChevronRight,
  FaUserCog,
  FaCog,
  FaBars,
  FaTimes,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import './AdminLayout.css';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';

const AdminLayout = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadAdminTheme = async () => {
      try {
        const response = await api.get('/admin/settings');
        const settings = response?.data || {};
        const root = document.documentElement;

        if (settings.primaryColor) {
          root.style.setProperty('--admin-blue', settings.primaryColor);
          root.style.setProperty('--admin-blue-light', settings.primaryColor + '22');
        }

        if (settings.secondaryColor) {
          root.style.setProperty('--admin-yellow', settings.secondaryColor);
          root.style.setProperty('--admin-yellow-light', settings.secondaryColor + '22');
        }

        if (settings.shopName) {
          root.style.setProperty('--admin-brand-name', settings.shopName);
        }
      } catch (error) {
        console.warn('Admin theme settings not available:', error.message);
      }
    };

    loadAdminTheme();
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `admin-nav-link${isActive ? ' admin-nav-link-active' : ''}`;

  return (
    <div className={`admin-layout${sidebarOpen ? ' admin-layout-sidebar-open' : ''}`}>
      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarOpen ? ' admin-sidebar-open' : ''}`} id="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar-top">
          <div className="admin-brand">
            <div className="admin-brand-logo">
              <BrandLogo variant="light" className="admin-brand-mark" />
            </div>
          </div>

          <div className="admin-panel-badge">
            <span className="admin-panel-dot"></span>
            ADMIN PANEL
          </div>
        </div>

        <div className="admin-navigation-label">
          MAIN MENU
        </div>

        <nav className="admin-nav" onClick={() => setSidebarOpen(false)}>

          {/* Dashboard */}
          <NavLink
            to="/admin/dashboard"
            className={linkClass}
          >
            <span className="admin-nav-icon">
              <FaTachometerAlt />
            </span>

            <span className="admin-nav-text">
              Dashboard
            </span>

            <FaChevronRight className="admin-nav-arrow" />
          </NavLink>

          {/* Analytics */}
          <NavLink
            to="/admin/analytics"
            className={linkClass}
          >
            <span className="admin-nav-icon">
              <FaChartLine />
            </span>

            <span className="admin-nav-text">
              Analytics
            </span>

            <FaChevronRight className="admin-nav-arrow" />
          </NavLink>

          {/* Designs */}
          <NavLink
            to="/admin/designs"
            className={linkClass}
          >
            <span className="admin-nav-icon">
              <FaImages />
            </span>

            <span className="admin-nav-text">
              Designs
            </span>

            <FaChevronRight className="admin-nav-arrow" />
          </NavLink>

          <NavLink
            to="/admin/templates"
            className={linkClass}
          >
            <span className="admin-nav-icon">
              <FaImages />
            </span>
            <span className="admin-nav-text">Templates</span>
            <FaChevronRight className="admin-nav-arrow" />
          </NavLink>

          {/* Categories */}
          <NavLink
            to="/admin/categories"
            className={linkClass}
          >
            <span className="admin-nav-icon">
              <FaThLarge />
            </span>

            <span className="admin-nav-text">
              Categories
            </span>

            <FaChevronRight className="admin-nav-arrow" />
          </NavLink>

          {/* Orders */}
          <NavLink
            to="/admin/orders"
            className={linkClass}
          >
            <span className="admin-nav-icon">
              <FaClipboardList />
            </span>

            <span className="admin-nav-text">
              Orders
            </span>

            <FaChevronRight className="admin-nav-arrow" />
          </NavLink>

          {/* Customers */}
          <NavLink
            to="/admin/customers"
            className={linkClass}
          >
            <span className="admin-nav-icon">
              <FaUsers />
            </span>

            <span className="admin-nav-text">
              Customers
            </span>

            <FaChevronRight className="admin-nav-arrow" />
          </NavLink>

          {/* Admin Profile */}
          <NavLink
            to="/admin/profile"
            className={linkClass}
          >
            <span className="admin-nav-icon">
              <FaUserCog />
            </span>

            <span className="admin-nav-text">
              Admin Profile
            </span>

            <FaChevronRight className="admin-nav-arrow" />
          </NavLink>

          {/* Admin Settings */}
          <NavLink
            to="/admin/settings"
            className={linkClass}
          >
            <span className="admin-nav-icon">
              <FaCog />
            </span>

            <span className="admin-nav-text">
              Admin Settings
            </span>

            <FaChevronRight className="admin-nav-arrow" />
          </NavLink>

        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-user-card">
            <div className="admin-user-avatar">
              {(admin?.name || 'A')
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="admin-user-info">
              <span className="admin-user-label">
                SIGNED IN AS
              </span>

              <strong>
                {admin?.name || 'Admin'}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="admin-logout-btn"
            onClick={handleLogout}
          >
            <span className="admin-logout-icon">
              <FaSignOutAlt />
            </span>

            <span>Logout</span>
          </button>
        </div>
      </aside>
      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
        tabIndex={sidebarOpen ? 0 : -1}
      />

      {/* Main Content */}
      <div className="admin-content">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-sidebar-toggle"
              aria-controls="admin-sidebar"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              {sidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
            <div className="admin-topbar-title">
              <span className="admin-topbar-indicator"></span>
              Admin Dashboard
            </div>

            <span className="admin-topbar-divider"></span>

            <span className="admin-topbar-welcome">
              Welcome back,{' '}
              <strong>
                {admin?.name || 'Admin'}
              </strong>
            </span>
          </div>

          <div className="admin-topbar-actions">
            <ThemeToggle />
            <div className="admin-topbar-status">
              <span className="admin-status-dot"></span>
              System Online
            </div>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;