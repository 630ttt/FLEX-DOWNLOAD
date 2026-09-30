import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerProtectedRoute from './components/CustomerProtectedRoute';
import CustomerLayout from './components/CustomerLayout';
import AdminLayout from './components/AdminLayout';

import Home from './pages/customer/Home';
import Catalogue from './pages/customer/Catalogue';
import DesignDetails from './pages/customer/DesignDetails';
import { RedirectCustomizeToEditor, RedirectTemplateCustomizeToEditor } from './components/LegacyRouteRedirects';
import OrderForm from './pages/customer/OrderForm';
import OrderSuccess from './pages/customer/OrderSuccess';
import PaymentMethod from './pages/customer/PaymentMethod';

import ScrollToTop from "./components/ScrollToTop";
import TrackOrder from './pages/customer/TrackOrder';
import Contact from './pages/customer/Contact';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerRegister from './pages/customer/CustomerRegister';
import CustomerAccount from './pages/customer/CustomerAccount';
import { PrivacyPolicy, TermsAndConditions, RefundPolicy } from './pages/customer/LegalPages';
import NotFound from './pages/customer/NotFound';
import HowIt from "./pages/customer/HowIt";
import { SolutionsPage, PricingPage, InspirationPage } from './pages/customer/MarketingPages';
import BrandLoader from './components/BrandLoader';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDesigns from './pages/admin/AdminDesigns';
import AdminDesignAdd from './pages/admin/AdminDesignAdd';
import AdminDesignEdit from './pages/admin/AdminDesignEdit';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminProfileSettings from './pages/admin/AdminProfileSettings';
import AdminSettings from './pages/admin/AdminSettings';

const DesignEditorPage = lazy(() => import('./pages/DesignEditorPage'));
const TemplateManagement = lazy(() => import('./pages/admin/TemplateManagement'));
const TemplateCreator = lazy(() => import('./pages/admin/TemplateCreator'));
const TemplateBrowser = lazy(() => import('./pages/customer/TemplateBrowser'));
const lazyPage = (Page) => (
  <Suspense fallback={<main className="page-container"><BrandLoader fullscreen /></main>}>
    <Page />
  </Suspense>
);

function App() {
  return (
    <AuthProvider>
    <CustomerAuthProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/editor" element={<Suspense fallback={<main className="design-studio-root design-studio-root--loading"><BrandLoader fullscreen /></main>}><DesignEditorPage /></Suspense>} />
        <Route path="/editor/template/:templateId" element={<Suspense fallback={<main className="design-studio-root design-studio-root--loading"><BrandLoader fullscreen /></main>}><DesignEditorPage /></Suspense>} />
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/templates" element={lazyPage(TemplateBrowser)} />
          <Route path="/templates/:id/customize" element={<RedirectTemplateCustomizeToEditor />} />
          <Route path="/design/:id" element={<DesignDetails />} />
          <Route path="/customize/:id" element={<RedirectCustomizeToEditor />} />
          <Route path="/design/:id/customize" element={<RedirectCustomizeToEditor />} />
          <Route path="/order/:designId" element={<OrderForm />} />
          <Route path="/payment-method" element={<PaymentMethod />} />
          <Route path="/order-success/:orderId" element={<OrderSuccess />} />
          <Route path="/track-order/:orderId" element={<TrackOrder />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/register" element={<CustomerRegister />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route element={<CustomerProtectedRoute />}>
            <Route path="/account" element={<CustomerAccount />} />
          </Route>
          <Route path="/how-it-works" element={<HowIt />} />
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/inspiration" element={<InspirationPage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/designs" element={<AdminDesigns />} />
            <Route path="/admin/designs/add" element={<AdminDesignAdd />} />
            <Route path="/admin/designs/edit/:id" element={<AdminDesignEdit />} />
            <Route path="/admin/templates" element={lazyPage(TemplateManagement)} />
            <Route path="/admin/templates/create" element={lazyPage(TemplateCreator)} />
            <Route path="/admin/templates/:id/edit" element={lazyPage(TemplateCreator)} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/profile" element={<AdminProfileSettings />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </CustomerAuthProvider>
    </AuthProvider>
  );
}

export default App;
