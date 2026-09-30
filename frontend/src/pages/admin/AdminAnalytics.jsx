import { useEffect, useMemo, useState } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaBoxOpen,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaRupeeSign,
  FaShoppingBag,
  FaTimesCircle,
  FaUsers,
} from 'react-icons/fa';

import { api } from '../../api/client';
import './AdminAnalytics.css';

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  'in-progress': 'In Progress',
  'awaiting-approval': 'Awaiting Approval',
  approved: 'Approved',
  ready: 'Ready',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const normalizeStatus = (status = '') => {
  return String(status)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
};

const getOrderAmount = (order) => {
  const values = [
    order?.totalAmount,
    order?.total,
    order?.amount,
    order?.grandTotal,
    order?.price,
    order?.payment?.amount,
  ];

  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return 0;
};

const getOrderDate = (order) => {
  return (
    order?.createdAt ||
    order?.orderDate ||
    order?.created_date ||
    order?.date ||
    order?.createdOn ||
    null
  );
};

const getCustomerName = (order) => {
  return (
    order?.customerName ||
    order?.customer?.name ||
    order?.user?.name ||
    order?.name ||
    'Customer'
  );
};

const getDesignName = (order) => {
  return (
    order?.designName ||
    order?.design?.name ||
    order?.design?.title ||
    order?.title ||
    order?.productName ||
    'Custom Design'
  );
};

const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
};

const formatDate = (date) => {
  if (!date) {
    return '—';
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/* =========================================================
   PERIOD HELPERS
========================================================= */

const getPeriodStart = (period) => {
  const now = new Date();
  const start = new Date(now);

  if (period === 'daily') {
    start.setHours(0, 0, 0, 0);
  }

  if (period === 'weekly') {
    const day = start.getDay();

    const diff = day === 0 ? 6 : day - 1;

    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  }

  if (period === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  if (period === 'yearly') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return start;
};

const getPreviousPeriodRange = (period) => {
  const now = new Date();

  let start;
  let end;

  if (period === 'daily') {
    start = new Date(now);

    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    end = new Date(start);
    end.setHours(23, 59, 59, 999);
  }

  if (period === 'weekly') {
    const currentStart = getPeriodStart('weekly');

    start = new Date(currentStart);
    start.setDate(start.getDate() - 7);

    end = new Date(currentStart);
    end.setMilliseconds(-1);
  }

  if (period === 'monthly') {
    const currentStart = getPeriodStart('monthly');

    start = new Date(currentStart);
    start.setMonth(start.getMonth() - 1);

    end = new Date(currentStart);
    end.setMilliseconds(-1);
  }

  if (period === 'yearly') {
    const currentStart = getPeriodStart('yearly');

    start = new Date(currentStart);
    start.setFullYear(start.getFullYear() - 1);

    end = new Date(currentStart);
    end.setMilliseconds(-1);
  }

  return {
    start,
    end,
  };
};

const isRevenueOrder = (order) => {
  const status = normalizeStatus(order?.status);

  return status !== 'cancelled';
};

/* =========================================================
   CHART DATA
========================================================= */

const getChartData = (orders, period) => {
  const now = new Date();

  /* =======================================================
     DAILY
     24 HOURS
  ======================================================= */

  if (period === 'daily') {
    return Array.from({ length: 24 }, (_, hour) => {
      const filtered = orders.filter((order) => {
        const rawDate = getOrderDate(order);

        if (!rawDate) {
          return false;
        }

        const date = new Date(rawDate);

        if (Number.isNaN(date.getTime())) {
          return false;
        }

        return (
          date.getDate() === now.getDate() &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear() &&
          date.getHours() === hour
        );
      });

      return {
        label: `${String(hour).padStart(2, '0')}:00`,

        orders: filtered.length,

        revenue: filtered
          .filter(isRevenueOrder)
          .reduce(
            (sum, order) =>
              sum + getOrderAmount(order),
            0
          ),
      };
    });
  }

  /* =======================================================
     WEEKLY
     MONDAY - SUNDAY
  ======================================================= */

  if (period === 'weekly') {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);

      const currentDay = date.getDay();

      const mondayOffset =
        currentDay === 0
          ? -6
          : 1 - currentDay;

      date.setDate(
        date.getDate() +
          mondayOffset +
          index
      );

      date.setHours(0, 0, 0, 0);

      const filtered = orders.filter((order) => {
        const rawDate = getOrderDate(order);

        if (!rawDate) {
          return false;
        }

        const orderDate = new Date(rawDate);

        if (Number.isNaN(orderDate.getTime())) {
          return false;
        }

        return (
          orderDate.getDate() === date.getDate() &&
          orderDate.getMonth() === date.getMonth() &&
          orderDate.getFullYear() === date.getFullYear()
        );
      });

      return {
        label: date.toLocaleDateString(
          'en-IN',
          {
            weekday: 'short',
          }
        ),

        orders: filtered.length,

        revenue: filtered
          .filter(isRevenueOrder)
          .reduce(
            (sum, order) =>
              sum + getOrderAmount(order),
            0
          ),
      };
    });
  }

  /* =======================================================
     MONTHLY
     CURRENT CALENDAR MONTH
  ======================================================= */

  if (period === 'monthly') {
    const year = now.getFullYear();
    const month = now.getMonth();

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    return Array.from(
      { length: daysInMonth },
      (_, index) => {
        const date = new Date(
          year,
          month,
          index + 1
        );

        date.setHours(0, 0, 0, 0);

        const filtered = orders.filter(
          (order) => {
            const rawDate =
              getOrderDate(order);

            if (!rawDate) {
              return false;
            }

            const orderDate =
              new Date(rawDate);

            if (
              Number.isNaN(
                orderDate.getTime()
              )
            ) {
              return false;
            }

            return (
              orderDate.getDate() ===
                date.getDate() &&
              orderDate.getMonth() ===
                date.getMonth() &&
              orderDate.getFullYear() ===
                date.getFullYear()
            );
          }
        );

        return {
          label: String(
            date.getDate()
          ),

          orders: filtered.length,

          revenue: filtered
            .filter(isRevenueOrder)
            .reduce(
              (sum, order) =>
                sum +
                getOrderAmount(order),
              0
            ),
        };
      }
    );
  }

  /* =======================================================
     YEARLY
     JANUARY - DECEMBER
  ======================================================= */

  return Array.from(
    { length: 12 },
    (_, index) => {
      const date = new Date(
        now.getFullYear(),
        index,
        1
      );

      const filtered = orders.filter(
        (order) => {
          const rawDate =
            getOrderDate(order);

          if (!rawDate) {
            return false;
          }

          const orderDate =
            new Date(rawDate);

          if (
            Number.isNaN(
              orderDate.getTime()
            )
          ) {
            return false;
          }

          return (
            orderDate.getMonth() ===
              index &&
            orderDate.getFullYear() ===
              now.getFullYear()
          );
        }
      );

      return {
        label: date.toLocaleDateString(
          'en-IN',
          {
            month: 'short',
          }
        ),

        orders: filtered.length,

        revenue: filtered
          .filter(isRevenueOrder)
          .reduce(
            (sum, order) =>
              sum + getOrderAmount(order),
            0
          ),
      };
    }
  );
};

/* =========================================================
   ANALYTICS BAR CHART
========================================================= */

const AnalyticsChart = ({
  data,
  type = 'revenue',
}) => {
  const maxValue = Math.max(
    ...data.map((item) =>
      type === 'revenue'
        ? item.revenue
        : item.orders
    ),
    1
  );

  return (
    <div className="analytics-chart">

      <div className="analytics-chart-y">

        <span>
          {type === 'revenue'
            ? formatCurrency(maxValue)
            : maxValue}
        </span>

        <span>
          {type === 'revenue'
            ? formatCurrency(
                maxValue / 2
              )
            : Math.round(
                maxValue / 2
              )}
        </span>

        <span>
          0
        </span>

      </div>

      <div className="analytics-chart-main">

        <div className="analytics-chart-grid">
          <span />
          <span />
          <span />
        </div>

        <div className="analytics-bars">

          {data.map(
            (item, index) => {
              const value =
                type === 'revenue'
                  ? item.revenue
                  : item.orders;

              const height = Math.max(
                (value / maxValue) *
                  100,
                value > 0 ? 4 : 0
              );

              return (
                <div
                  className="analytics-bar-column"
                  key={`${item.label}-${index}`}
                  title={
                    type === 'revenue'
                      ? `${item.label}: ${formatCurrency(
                          value
                        )}`
                      : `${item.label}: ${value} orders`
                  }
                >

                  <div className="analytics-bar-value">

                    {value > 0 &&
                      (type ===
                      'revenue'
                        ? formatCurrency(
                            value
                          )
                        : value)}

                  </div>

                  <div className="analytics-bar-track">

                    <div
                      className={`analytics-bar ${
                        type === 'orders'
                          ? 'analytics-bar-orders'
                          : ''
                      }`}
                      style={{
                        height: `${height}%`,
                      }}
                    />

                  </div>

                  <span className="analytics-bar-label">
                    {item.label}
                  </span>

                </div>
              );
            }
          )}

        </div>

      </div>

    </div>
  );
};

/* =========================================================
   MAIN ANALYTICS PAGE
========================================================= */

const AdminAnalytics = () => {
  const [period, setPeriod] =
    useState('weekly');

  const [orders, setOrders] =
    useState([]);

  const [customers, setCustomers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [lastUpdated, setLastUpdated] =
    useState(null);

  /* =======================================================
     FETCH ANALYTICS
  ======================================================= */

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        ordersResponse,
        customersResponse,
      ] = await Promise.all([
        api.get('/admin/orders', {
          page: 1,
          limit: 10000,
        }),

        api.get('/admin/customers', {
          page: 1,
          limit: 10000,
        }),
      ]);

      const orderList =
        ordersResponse?.orders ||
        ordersResponse?.data ||
        ordersResponse?.items ||
        [];

      const customerList =
        customersResponse?.customers ||
        customersResponse?.data ||
        customersResponse?.items ||
        [];

      setOrders(
        Array.isArray(orderList)
          ? orderList
          : []
      );

      setCustomers(
        Array.isArray(customerList)
          ? customerList
          : []
      );

      setLastUpdated(
        new Date()
      );
    } catch (err) {
      console.error(
        'Analytics loading error:',
        err
      );

      setError(
        err?.message ||
          'Unable to load analytics data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  /* =======================================================
     CALCULATE ANALYTICS
  ======================================================= */

  const analytics = useMemo(() => {
    const validOrders =
      orders.filter((order) => {
        const date =
          getOrderDate(order);

        if (!date) {
          return false;
        }

        const parsed =
          new Date(date);

        return !Number.isNaN(
          parsed.getTime()
        );
      });

    /* =====================================================
       ALL-TIME DATA
    ===================================================== */

    const totalOrders =
      validOrders.length;

    const totalRevenue =
      validOrders
        .filter(isRevenueOrder)
        .reduce(
          (sum, order) =>
            sum +
            getOrderAmount(order),
          0
        );

    const completedOrders =
      validOrders.filter(
        (order) => {
          const status =
            normalizeStatus(
              order?.status
            );

          return [
            'delivered',
            'completed',
          ].includes(status);
        }
      ).length;

    const pendingOrders =
      validOrders.filter(
        (order) => {
          const status =
            normalizeStatus(
              order?.status
            );

          return [
            'pending',
            'order-placed',
            'confirmed',
            'in-progress',
            'awaiting-approval',
            'approved',
            'ready',
          ].includes(status);
        }
      ).length;

    const cancelledOrders =
      validOrders.filter(
        (order) =>
          normalizeStatus(
            order?.status
          ) === 'cancelled'
      ).length;

    const revenueOrders =
      validOrders.filter(
        isRevenueOrder
      );

    const averageOrderValue =
      revenueOrders.length > 0
        ? totalRevenue /
          revenueOrders.length
        : 0;

    /* =====================================================
       DAILY REVENUE
    ===================================================== */

    const dailyStart =
      getPeriodStart('daily');

    const dailyOrders =
      validOrders.filter(
        (order) => {
          const date =
            new Date(
              getOrderDate(order)
            );

          return date >= dailyStart;
        }
      );

    const dailyRevenue =
      dailyOrders
        .filter(isRevenueOrder)
        .reduce(
          (sum, order) =>
            sum +
            getOrderAmount(order),
          0
        );

    /* =====================================================
       WEEKLY REVENUE
    ===================================================== */

    const weeklyStart =
      getPeriodStart('weekly');

    const weeklyOrders =
      validOrders.filter(
        (order) => {
          const date =
            new Date(
              getOrderDate(order)
            );

          return date >= weeklyStart;
        }
      );

    const weeklyRevenue =
      weeklyOrders
        .filter(isRevenueOrder)
        .reduce(
          (sum, order) =>
            sum +
            getOrderAmount(order),
          0
        );

    /* =====================================================
       MONTHLY REVENUE
    ===================================================== */

    const monthlyStart =
      getPeriodStart('monthly');

    const monthlyOrders =
      validOrders.filter(
        (order) => {
          const date =
            new Date(
              getOrderDate(order)
            );

          return date >= monthlyStart;
        }
      );

    const monthlyRevenue =
      monthlyOrders
        .filter(isRevenueOrder)
        .reduce(
          (sum, order) =>
            sum +
            getOrderAmount(order),
          0
        );

    /* =====================================================
       YEARLY REVENUE
    ===================================================== */

    const yearlyStart =
      getPeriodStart('yearly');

    const yearlyOrders =
      validOrders.filter(
        (order) => {
          const date =
            new Date(
              getOrderDate(order)
            );

          return date >= yearlyStart;
        }
      );

    const yearlyRevenue =
      yearlyOrders
        .filter(isRevenueOrder)
        .reduce(
          (sum, order) =>
            sum +
            getOrderAmount(order),
          0
        );

    /* =====================================================
       SELECTED PERIOD
    ===================================================== */

    const currentStart =
      getPeriodStart(period);

    const currentOrders =
      validOrders.filter(
        (order) => {
          const date =
            new Date(
              getOrderDate(order)
            );

          return date >= currentStart;
        }
      );

    const currentRevenue =
      currentOrders
        .filter(isRevenueOrder)
        .reduce(
          (sum, order) =>
            sum +
            getOrderAmount(order),
          0
        );

    /* =====================================================
       PREVIOUS PERIOD
    ===================================================== */

    const previousRange =
      getPreviousPeriodRange(
        period
      );

    const previousOrders =
      validOrders.filter(
        (order) => {
          const date =
            new Date(
              getOrderDate(order)
            );

          return (
            date >=
              previousRange.start &&
            date <=
              previousRange.end
          );
        }
      );

    const previousRevenue =
      previousOrders
        .filter(isRevenueOrder)
        .reduce(
          (sum, order) =>
            sum +
            getOrderAmount(order),
          0
        );

    const revenueGrowth =
      previousRevenue > 0
        ? ((currentRevenue -
            previousRevenue) /
            previousRevenue) *
          100
        : currentRevenue > 0
        ? 100
        : 0;

    /* =====================================================
       CHART
    ===================================================== */

    const chartData =
      getChartData(
        validOrders,
        period
      );

    /* =====================================================
       STATUS DATA
    ===================================================== */

    const statusCounts = {};

    validOrders.forEach(
      (order) => {
        const status =
          normalizeStatus(
            order?.status
          ) || 'pending';

        statusCounts[status] =
          (statusCounts[status] || 0) +
          1;
      }
    );

    const statusData =
      Object.entries(
        statusCounts
      )
        .map(
          ([status, count]) => ({
            status,

            label:
              STATUS_LABELS[
                status
              ] ||
              status
                .split('-')
                .map(
                  (word) =>
                    word
                      .charAt(0)
                      .toUpperCase() +
                    word.slice(1)
                )
                .join(' '),

            count,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        );

    /* =====================================================
       TOP DESIGNS
    ===================================================== */

    const designMap = {};

    validOrders.forEach(
      (order) => {
        const design =
          getDesignName(order);

        const amount =
          getOrderAmount(order);

        if (!designMap[design]) {
          designMap[design] = {
            name: design,
            orders: 0,
            revenue: 0,
          };
        }

        designMap[design].orders +=
          1;

        if (
          isRevenueOrder(order)
        ) {
          designMap[
            design
          ].revenue += amount;
        }
      }
    );

    const topDesigns =
      Object.values(designMap)
        .sort(
          (a, b) =>
            b.revenue -
            a.revenue
        )
        .slice(0, 5);

    /* =====================================================
       RECENT ORDERS
    ===================================================== */

    const recentOrders =
      [...validOrders]
        .sort(
          (a, b) =>
            new Date(
              getOrderDate(b)
            ) -
            new Date(
              getOrderDate(a)
            )
        )
        .slice(0, 8);

    return {
      totalOrders,
      totalRevenue,

      completedOrders,
      pendingOrders,
      cancelledOrders,

      averageOrderValue,

      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,

      currentOrders:
        currentOrders.length,

      currentRevenue,

      revenueGrowth,

      chartData,

      statusData,

      topDesigns,

      recentOrders,
    };
  }, [
    orders,
    customers,
    period,
  ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="admin-analytics-page">

        <div className="analytics-loading">

          <div className="analytics-spinner" />

          <p>
            Loading analytics...
          </p>

        </div>

      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="admin-analytics-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="analytics-header">

        <div>

          <div className="analytics-eyebrow">
            BUSINESS INTELLIGENCE
          </div>

          <h1>
            Analytics
          </h1>

          <p>
            Monitor orders, revenue,
            customers and business
            performance from one place.
          </p>

        </div>

        <button
          className="analytics-refresh-btn"
          onClick={fetchAnalytics}
          type="button"
        >
          <FaChartLine />

          Refresh Data
        </button>

      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="analytics-error">

          <FaTimesCircle />

          <span>
            {error}
          </span>

        </div>
      )}

      {/* ===================================================
          PERIOD FILTER
      =================================================== */}

      <div className="analytics-toolbar">

        <div className="analytics-periods">

          {PERIODS.map(
            (item) => (
              <button
                key={item.key}
                type="button"
                className={
                  period ===
                  item.key
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setPeriod(
                    item.key
                  )
                }
              >
                {item.label}
              </button>
            )
          )}

        </div>

        <div className="analytics-last-updated">

          <FaCalendarAlt />

          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString(
                'en-IN',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}`
            : 'Analytics'}

        </div>

      </div>

      {/* ===================================================
          PERIOD REVENUE CARDS
      =================================================== */}

      <div className="analytics-revenue-period-grid">

        {/* DAILY */}

        <div
          className={`analytics-revenue-period-card ${
            period === 'daily'
              ? 'selected'
              : ''
          }`}
          onClick={() =>
            setPeriod('daily')
          }
        >

          <div className="analytics-revenue-period-top">

            <span>
              DAILY REVENUE
            </span>

            <FaCalendarAlt />

          </div>

          <strong>
            {formatCurrency(
              analytics.dailyRevenue
            )}
          </strong>

          <small>
            Today's revenue
          </small>

        </div>

        {/* WEEKLY */}

        <div
          className={`analytics-revenue-period-card ${
            period === 'weekly'
              ? 'selected'
              : ''
          }`}
          onClick={() =>
            setPeriod('weekly')
          }
        >

          <div className="analytics-revenue-period-top">

            <span>
              WEEKLY REVENUE
            </span>

            <FaCalendarAlt />

          </div>

          <strong>
            {formatCurrency(
              analytics.weeklyRevenue
            )}
          </strong>

          <small>
            Current week revenue
          </small>

        </div>

        {/* MONTHLY */}

        <div
          className={`analytics-revenue-period-card ${
            period === 'monthly'
              ? 'selected'
              : ''
          }`}
          onClick={() =>
            setPeriod('monthly')
          }
        >

          <div className="analytics-revenue-period-top">

            <span>
              MONTHLY REVENUE
            </span>

            <FaCalendarAlt />

          </div>

          <strong>
            {formatCurrency(
              analytics.monthlyRevenue
            )}
          </strong>

          <small>
            Current month revenue
          </small>

        </div>

        {/* YEARLY */}

        <div
          className={`analytics-revenue-period-card ${
            period === 'yearly'
              ? 'selected'
              : ''
          }`}
          onClick={() =>
            setPeriod('yearly')
          }
        >

          <div className="analytics-revenue-period-top">

            <span>
              YEARLY REVENUE
            </span>

            <FaCalendarAlt />

          </div>

          <strong>
            {formatCurrency(
              analytics.yearlyRevenue
            )}
          </strong>

          <small>
            Current year revenue
          </small>

        </div>

      </div>

      {/* ===================================================
          MAIN STAT CARDS
      =================================================== */}

      <div className="analytics-stats-grid">

        {/* SELECTED PERIOD REVENUE */}

        <div className="analytics-stat-card revenue">

          <div className="analytics-stat-top">

            <div className="analytics-stat-icon">
              <FaRupeeSign />
            </div>

            <span className="analytics-stat-period">
              {period.toUpperCase()}
            </span>

          </div>

          <span className="analytics-stat-label">

            {period.charAt(0).toUpperCase() +
              period.slice(1)}{' '}
            Revenue

          </span>

          <strong>
            {formatCurrency(
              analytics.currentRevenue
            )}
          </strong>

          <div
            className={`analytics-growth ${
              analytics.revenueGrowth >=
              0
                ? 'positive'
                : 'negative'
            }`}
          >

            {analytics.revenueGrowth >=
            0 ? (
              <FaArrowUp />
            ) : (
              <FaArrowDown />
            )}

            {Math.abs(
              analytics.revenueGrowth
            ).toFixed(1)}
            %

            <span>
              vs previous period
            </span>

          </div>

        </div>

        {/* ALL TIME REVENUE */}

        <div className="analytics-stat-card revenue">

          <div className="analytics-stat-top">

            <div className="analytics-stat-icon">
              <FaRupeeSign />
            </div>

            <span className="analytics-stat-period">
              ALL TIME
            </span>

          </div>

          <span className="analytics-stat-label">
            Total Revenue
          </span>

          <strong>
            {formatCurrency(
              analytics.totalRevenue
            )}
          </strong>

          <div className="analytics-stat-sub">
            Revenue from all orders
          </div>

        </div>

        {/* TOTAL ORDERS */}

        <div className="analytics-stat-card orders">

          <div className="analytics-stat-top">

            <div className="analytics-stat-icon">
              <FaShoppingBag />
            </div>

          </div>

          <span className="analytics-stat-label">
            Total Orders
          </span>

          <strong>
            {analytics.totalOrders}
          </strong>

          <div className="analytics-stat-sub">
            {analytics.currentOrders}{' '}
            in selected period
          </div>

        </div>

        {/* COMPLETED */}

        <div className="analytics-stat-card completed">

          <div className="analytics-stat-top">

            <div className="analytics-stat-icon">
              <FaCheckCircle />
            </div>

          </div>

          <span className="analytics-stat-label">
            Completed Orders
          </span>

          <strong>
            {analytics.completedOrders}
          </strong>

          <div className="analytics-stat-sub">
            Successfully delivered
          </div>

        </div>

        {/* PENDING */}

        <div className="analytics-stat-card pending">

          <div className="analytics-stat-top">

            <div className="analytics-stat-icon">
              <FaClock />
            </div>

          </div>

          <span className="analytics-stat-label">
            Pending Orders
          </span>

          <strong>
            {analytics.pendingOrders}
          </strong>

          <div className="analytics-stat-sub">
            Currently active
          </div>

        </div>

        {/* CUSTOMERS */}

        <div className="analytics-stat-card customers">

          <div className="analytics-stat-top">

            <div className="analytics-stat-icon">
              <FaUsers />
            </div>

          </div>

          <span className="analytics-stat-label">
            Total Customers
          </span>

          <strong>
            {customers.length}
          </strong>

          <div className="analytics-stat-sub">
            Registered customers
          </div>

        </div>

        {/* AVERAGE ORDER */}

        <div className="analytics-stat-card average">

          <div className="analytics-stat-top">

            <div className="analytics-stat-icon">
              <FaBoxOpen />
            </div>

          </div>

          <span className="analytics-stat-label">
            Average Order Value
          </span>

          <strong>
            {formatCurrency(
              analytics.averageOrderValue
            )}
          </strong>

          <div className="analytics-stat-sub">
            Average revenue per order
          </div>

        </div>

      </div>

      {/* ===================================================
          REVENUE + ORDER CHARTS
      =================================================== */}

      <div className="analytics-main-grid">

        {/* REVENUE */}

        <section className="analytics-panel analytics-large-panel">

          <div className="analytics-panel-header">

            <div>

              <span className="analytics-panel-kicker">
                REVENUE PERFORMANCE
              </span>

              <h2>
                Revenue Overview
              </h2>

              <p>
                Revenue generated during
                the selected period.
              </p>

            </div>

            <div className="analytics-panel-total">

              <span>
                Period Revenue
              </span>

              <strong>
                {formatCurrency(
                  analytics.currentRevenue
                )}
              </strong>

            </div>

          </div>

          <AnalyticsChart
            data={
              analytics.chartData
            }
            type="revenue"
          />

        </section>

        {/* ORDERS */}

        <section className="analytics-panel analytics-large-panel">

          <div className="analytics-panel-header">

            <div>

              <span className="analytics-panel-kicker">
                ORDER PERFORMANCE
              </span>

              <h2>
                Orders Overview
              </h2>

              <p>
                Orders received during
                the selected period.
              </p>

            </div>

            <div className="analytics-panel-total">

              <span>
                Period Orders
              </span>

              <strong>
                {analytics.currentOrders}
              </strong>

            </div>

          </div>

          <AnalyticsChart
            data={
              analytics.chartData
            }
            type="orders"
          />

        </section>

      </div>

      {/* ===================================================
          STATUS + TOP DESIGNS
      =================================================== */}

      <div className="analytics-secondary-grid">

        {/* STATUS */}

        <section className="analytics-panel">

          <div className="analytics-panel-header compact">

            <div>

              <span className="analytics-panel-kicker">
                ORDER BREAKDOWN
              </span>

              <h2>
                Order Status
              </h2>

            </div>

          </div>

          {analytics.statusData.length ===
          0 ? (
            <div className="analytics-empty">
              No order data available.
            </div>
          ) : (
            <div className="analytics-status-list">

              {analytics.statusData.map(
                (item, index) => {
                  const percentage =
                    analytics.totalOrders >
                    0
                      ? (item.count /
                          analytics.totalOrders) *
                        100
                      : 0;

                  return (
                    <div
                      className="analytics-status-item"
                      key={
                        item.status
                      }
                    >

                      <div className="analytics-status-info">

                        <div className="analytics-status-name">

                          <span
                            className={`analytics-status-dot status-${index}`}
                          />

                          {item.label}

                        </div>

                        <strong>
                          {item.count}
                        </strong>

                      </div>

                      <div className="analytics-progress">

                        <span
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                      <small>
                        {percentage.toFixed(
                          1
                        )}
                        %
                      </small>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* DESIGNS */}

        <section className="analytics-panel">

          <div className="analytics-panel-header compact">

            <div>

              <span className="analytics-panel-kicker">
                TOP PERFORMERS
              </span>

              <h2>
                Best Performing Designs
              </h2>

            </div>

          </div>

          {analytics.topDesigns
            .length === 0 ? (
            <div className="analytics-empty">
              No design sales data available.
            </div>
          ) : (
            <div className="analytics-design-list">

              {analytics.topDesigns.map(
                (design, index) => (
                  <div
                    className="analytics-design-item"
                    key={
                      design.name
                    }
                  >

                    <div className="analytics-design-rank">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        '0'
                      )}
                    </div>

                    <div className="analytics-design-content">

                      <strong>
                        {design.name}
                      </strong>

                      <span>
                        {design.orders}{' '}
                        orders
                      </span>

                    </div>

                    <strong className="analytics-design-revenue">
                      {formatCurrency(
                        design.revenue
                      )}
                    </strong>

                  </div>
                )
              )}

            </div>
          )}

        </section>

      </div>

      {/* ===================================================
          RECENT ORDERS
      =================================================== */}

      <section className="analytics-panel analytics-recent-panel">

        <div className="analytics-panel-header">

          <div>

            <span className="analytics-panel-kicker">
              LIVE ORDER ACTIVITY
            </span>

            <h2>
              Recent Orders
            </h2>

            <p>
              Latest orders received by
              Yamini Flex Printing.
            </p>

          </div>

          <div className="analytics-recent-count">
            {analytics.recentOrders.length}{' '}
            recent
          </div>

        </div>

        {analytics.recentOrders
          .length === 0 ? (
          <div className="analytics-empty">
            No orders available.
          </div>
        ) : (
          <div className="analytics-table-wrapper">

            <table className="analytics-table">

              <thead>

                <tr>

                  <th>
                    Order
                  </th>

                  <th>
                    Customer
                  </th>

                  <th>
                    Design
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                {analytics.recentOrders.map(
                  (
                    order,
                    index
                  ) => {
                    const status =
                      normalizeStatus(
                        order?.status
                      );

                    return (
                      <tr
                        key={
                          order?._id ||
                          order?.id ||
                          index
                        }
                      >

                        <td>

                          <strong>
                            #
                            {String(
                              order?._id ||
                                order?.id ||
                                index +
                                  1
                            ).slice(
                              -8
                            )}
                          </strong>

                        </td>

                        <td>
                          {getCustomerName(
                            order
                          )}
                        </td>

                        <td>
                          {getDesignName(
                            order
                          )}
                        </td>

                        <td>
                          {formatDate(
                            getOrderDate(
                              order
                            )
                          )}
                        </td>

                        <td>

                          <strong>
                            {formatCurrency(
                              getOrderAmount(
                                order
                              )
                            )}
                          </strong>

                        </td>

                        <td>

                          <span
                            className={`analytics-order-status status-${status}`}
                          >
                            {STATUS_LABELS[
                              status
                            ] ||
                              status ||
                              'Pending'}
                          </span>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* ===================================================
          FOOTER INSIGHT
      =================================================== */}

      <div className="analytics-insight">

        <div className="analytics-insight-icon">
          <FaChartLine />
        </div>

        <div>

          <strong>
            Business Performance
          </strong>

          <p>

            Your dashboard is currently
            tracking{' '}

            <b>
              {analytics.totalOrders}
            </b>{' '}

            total orders and{' '}

            <b>
              {formatCurrency(
                analytics.totalRevenue
              )}
            </b>{' '}

            in total revenue.

            {' '}

            During the{' '}

            <b>
              {period}
            </b>{' '}

            period, revenue generated is{' '}

            <b>
              {formatCurrency(
                analytics.currentRevenue
              )}
            </b>.

          </p>

        </div>

      </div>

    </div>
  );
};

export default AdminAnalytics;