import { useEffect, useMemo, useState } from 'react';
import {
  FaImages,
  FaClipboardList,
  FaUsers,
  FaThLarge,
  FaArrowUp,
  FaArrowRight,
  FaPlus,
  FaEye,
  FaLayerGroup,
  FaChartPie,
  FaChartBar,
  FaShoppingBag,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    designs: 0,
    categories: 0,
    orders: 0,
    customers: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      api.get('/admin/designs', { limit: 1 }),
      api.get('/admin/categories'),
      api.get('/admin/orders', { limit: 1 }),
      api.get('/admin/customers', { limit: 1 }),
    ])
      .then(([designs, categories, orders, customers]) => {
        setStats({
          designs: designs.pagination?.total ?? 0,
          categories: categories.count ?? categories.data?.length ?? 0,
          orders: orders.pagination?.total ?? 0,
          customers: customers.pagination?.total ?? 0,
        });
      })
      .catch(() => {
        // Keep the existing dashboard behavior if an API fails.
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const cards = [
    {
      label: 'Total Designs',
      value: stats.designs,
      icon: <FaImages />,
      className: 'blue',
      description: 'Available designs',
    },
    {
      label: 'Categories',
      value: stats.categories,
      icon: <FaThLarge />,
      className: 'yellow',
      description: 'Design categories',
    },
    {
      label: 'Total Orders',
      value: stats.orders,
      icon: <FaClipboardList />,
      className: 'green',
      description: 'Customer orders',
    },
    {
      label: 'Customers',
      value: stats.customers,
      icon: <FaUsers />,
      className: 'navy',
      description: 'Registered customers',
    },
  ];

  /*
   * These values are based directly on the existing API totals.
   * They are used only for visual comparison on the dashboard.
   */
  const maxMetric = useMemo(() => {
    return Math.max(
      stats.designs,
      stats.categories,
      stats.orders,
      stats.customers,
      1
    );
  }, [stats]);

  const chartData = [
    {
      label: 'Designs',
      value: stats.designs,
      icon: <FaImages />,
      className: 'blue',
    },
    {
      label: 'Categories',
      value: stats.categories,
      icon: <FaThLarge />,
      className: 'yellow',
    },
    {
      label: 'Orders',
      value: stats.orders,
      icon: <FaClipboardList />,
      className: 'gold',
    },
    {
      label: 'Customers',
      value: stats.customers,
      icon: <FaUsers />,
      className: 'navy',
    },
  ];

  const totalPlatformItems =
    stats.designs +
    stats.categories +
    stats.orders +
    stats.customers;

  const platformPercentages = chartData.map((item) => ({
    ...item,
    percentage:
      totalPlatformItems > 0
        ? Math.round((item.value / totalPlatformItems) * 100)
        : 0,
  }));

  return (
    <div className="admin-dashboard-page">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="dashboard-header">

        <div className="dashboard-header-content">
          <div className="dashboard-heading-wrap">

            <span className="dashboard-eyebrow">
              ADMIN CONTROL CENTER
            </span>

            <h1 className="section-title">
              Dashboard
            </h1>

            <p className="section-subtitle">
              Monitor your designs, categories, orders and customers
              from one place.
            </p>

          </div>

          <div className="dashboard-header-badge">
            <span className="dashboard-status-dot"></span>
            System Overview
          </div>
        </div>

      </div>


      {/* =====================================================
          KPI CARDS
          ===================================================== */}

      <div className="dashboard-grid">

        {cards.map((card) => (
          <div
            key={card.label}
            className={`card dashboard-card dashboard-card-${card.className}`}
          >

            <div className="dashboard-card-top">

              <div className="dashboard-card-icon">
                {card.icon}
              </div>

              <div className="dashboard-card-trend">
                <FaArrowUp />
                <span>Live</span>
              </div>

            </div>

            <div className="dashboard-card-content">

              <p className="dashboard-card-value">
                {loading ? '—' : card.value}
              </p>

              <p className="dashboard-card-label">
                {card.label}
              </p>

              <p className="dashboard-card-description">
                {card.description}
              </p>

            </div>

          </div>
        ))}

      </div>


      {/* =====================================================
          ANALYTICS SECTION
          ===================================================== */}

      <div className="dashboard-analytics-grid">

        {/* BAR / COMPARISON CHART */}

        <section className="dashboard-panel dashboard-chart-panel">

          <div className="dashboard-panel-header">

            <div>
              <div className="dashboard-panel-title-row">
                <FaChartBar className="dashboard-panel-title-icon" />

                <h2>
                  Platform Overview
                </h2>
              </div>

              <p>
                Current platform totals across major areas.
              </p>
            </div>

            <span className="dashboard-panel-badge">
              LIVE DATA
            </span>

          </div>


          <div className="dashboard-bars">

            {chartData.map((item) => {
              const percentage =
                maxMetric > 0
                  ? Math.max((item.value / maxMetric) * 100, 4)
                  : 4;

              return (
                <div
                  key={item.label}
                  className="dashboard-bar-row"
                >

                  <div className="dashboard-bar-label">

                    <span
                      className={`dashboard-bar-icon ${item.className}`}
                    >
                      {item.icon}
                    </span>

                    <span>
                      {item.label}
                    </span>

                  </div>

                  <div className="dashboard-bar-track">

                    <div
                      className={`dashboard-bar-fill ${item.className}`}
                      style={{
                        width: `${loading ? 0 : percentage}%`,
                      }}
                    ></div>

                  </div>

                  <strong>
                    {loading ? '—' : item.value}
                  </strong>

                </div>
              );
            })}

          </div>

        </section>


        {/* DONUT / PLATFORM MIX */}

        <section className="dashboard-panel dashboard-mix-panel">

          <div className="dashboard-panel-header">

            <div>
              <div className="dashboard-panel-title-row">
                <FaChartPie className="dashboard-panel-title-icon" />

                <h2>
                  Platform Mix
                </h2>
              </div>

              <p>
                Distribution of current dashboard metrics.
              </p>
            </div>

          </div>


          <div className="dashboard-donut-wrapper">

            <div
              className="dashboard-donut"
              style={{
                background: `conic-gradient(
                  #c9a227 0% ${platformPercentages[0]?.percentage || 0}%,
                  #e8d48a ${platformPercentages[0]?.percentage || 0}% ${
                  (platformPercentages[0]?.percentage || 0) +
                  (platformPercentages[1]?.percentage || 0)
                }%,
                  #8c6a1d ${
                    (platformPercentages[0]?.percentage || 0) +
                    (platformPercentages[1]?.percentage || 0)
                  }% ${
                  (platformPercentages[0]?.percentage || 0) +
                  (platformPercentages[1]?.percentage || 0) +
                  (platformPercentages[2]?.percentage || 0)
                }%,
                  #171717 ${
                    (platformPercentages[0]?.percentage || 0) +
                    (platformPercentages[1]?.percentage || 0) +
                    (platformPercentages[2]?.percentage || 0)
                }% 100%
                )`,
              }}
            >

              <div className="dashboard-donut-inner">

                <strong>
                  {loading ? '—' : totalPlatformItems}
                </strong>

                <span>
                  Total
                </span>

              </div>

            </div>


            <div className="dashboard-mix-legend">

              {platformPercentages.map((item) => (
                <div
                  className="dashboard-legend-item"
                  key={item.label}
                >

                  <span
                    className={`dashboard-legend-dot ${item.className}`}
                  ></span>

                  <div>
                    <span className="dashboard-legend-label">
                      {item.label}
                    </span>

                    <strong>
                      {loading ? '—' : `${item.percentage}%`}
                    </strong>
                  </div>

                </div>
              ))}

            </div>

          </div>

        </section>

      </div>


      {/* =====================================================
          QUICK ACTIONS
          ===================================================== */}

      <section className="dashboard-panel dashboard-actions-panel">

        <div className="dashboard-panel-header">

          <div>
            <div className="dashboard-panel-title-row">
              <FaLayerGroup className="dashboard-panel-title-icon" />

              <h2>
                Quick Actions
              </h2>
            </div>

            <p>
              Quickly access the most frequently used admin tools.
            </p>
          </div>

        </div>


        <div className="dashboard-actions-grid">

          <Link
            to="/admin/designs"
            className="dashboard-action-card"
          >
            <span className="dashboard-action-icon blue">
              <FaPlus />
            </span>

            <div>
              <strong>
                Add Design
              </strong>

              <span>
                Create a new flex design
              </span>
            </div>

            <FaArrowRight className="dashboard-action-arrow" />
          </Link>


          <Link
            to="/admin/categories"
            className="dashboard-action-card"
          >
            <span className="dashboard-action-icon yellow">
              <FaPlus />
            </span>

            <div>
              <strong>
                Add Category
              </strong>

              <span>
                Organize your catalogue
              </span>
            </div>

            <FaArrowRight className="dashboard-action-arrow" />
          </Link>


          <Link
            to="/admin/orders"
            className="dashboard-action-card"
          >
            <span className="dashboard-action-icon navy">
              <FaShoppingBag />
            </span>

            <div>
              <strong>
                View Orders
              </strong>

              <span>
                Manage customer orders
              </span>
            </div>

            <FaArrowRight className="dashboard-action-arrow" />
          </Link>


          <Link
            to="/admin/customers"
            className="dashboard-action-card"
          >
            <span className="dashboard-action-icon blue">
              <FaEye />
            </span>

            <div>
              <strong>
                Customers
              </strong>

              <span>
                View registered customers
              </span>
            </div>

            <FaArrowRight className="dashboard-action-arrow" />
          </Link>

        </div>

      </section>


      {/* =====================================================
          MANAGEMENT SUMMARY
          ===================================================== */}

      <section className="dashboard-summary-grid">

        <div className="dashboard-summary-card">

          <div className="dashboard-summary-icon blue">
            <FaImages />
          </div>

          <div>
            <span>
              Catalogue
            </span>

            <strong>
              {loading ? 'Loading...' : `${stats.designs} Designs`}
            </strong>

            <p>
              Organized across {loading ? '—' : stats.categories} categories.
            </p>
          </div>

        </div>


        <div className="dashboard-summary-card">

          <div className="dashboard-summary-icon yellow">
            <FaClipboardList />
          </div>

          <div>
            <span>
              Orders
            </span>

            <strong>
              {loading ? 'Loading...' : `${stats.orders} Orders`}
            </strong>

            <p>
              Manage and track customer requests.
            </p>
          </div>

        </div>


        <div className="dashboard-summary-card">

          <div className="dashboard-summary-icon navy">
            <FaUsers />
          </div>

          <div>
            <span>
              Customers
            </span>

            <strong>
              {loading ? 'Loading...' : `${stats.customers} Customers`}
            </strong>

            <p>
              Registered customers in your system.
            </p>
          </div>

        </div>

      </section>

    </div>
  );
};

export default AdminDashboard;