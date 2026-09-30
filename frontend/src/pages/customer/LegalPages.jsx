import { BUSINESS } from '../../constants/business';
import './LegalPages.css';

const LegalPage = ({ title, children }) => (
  <div className="page-container legal-page">
    <h1 className="section-title">{title}</h1>
    <div className="legal-page-content">{children}</div>
  </div>
);

export const PrivacyPolicy = () => (
  <LegalPage title="Privacy Policy">
    <p>
      {BUSINESS.name} collects only the information you provide when placing an order (name, phone number, email,
      address, and any reference files you upload) in order to process and deliver your print order.
    </p>
    <p>We do not sell or share your personal information with third parties except as required to fulfil your order.</p>
    <p>For any questions about your data, please contact us directly at {BUSINESS.phone}.</p>
  </LegalPage>
);

export const TermsAndConditions = () => (
  <LegalPage title="Terms & Conditions">
    <p>By placing an order with {BUSINESS.name}, you agree to provide accurate design and contact details.</p>
    <p>Final designs are shared for your approval before printing. Once approved, orders proceed to production and cannot be cancelled.</p>
    <p>Delivery timelines are estimates and may vary based on order volume and material availability.</p>
  </LegalPage>
);

export const RefundPolicy = () => (
  <LegalPage title="Refund Policy">
    <p>Since all orders are custom-printed to your specifications, refunds are only applicable in case of a printing defect or error on our part.</p>
    <p>Please inspect your order upon pickup/delivery and report any issues within 24 hours to {BUSINESS.phone}.</p>
    <p>Approved refunds or reprints will be processed at no additional cost to you.</p>
  </LegalPage>
);
