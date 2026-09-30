import { Link } from 'react-router-dom';
import { SERVICE_DETAILS, RATE_CARD_MATERIALS, BUSINESS, HOW_IT_WORKS } from '../../constants/business';
import Reveal from '../../components/Reveal';
import CtaBanner from '../../components/premium/CtaBanner';
import './MarketingPages.css';

export const SolutionsPage = () => (
  <main className="marketing-page">
    <section className="marketing-hero premium-container">
      <Reveal>
        <span className="section-kicker">Solutions</span>
        <h1 className="section-title">Print solutions for every occasion</h1>
        <p className="marketing-lead">
          From storefront flex to wedding invitations — studio workflows, proofing, and dispatch built for {BUSINESS.location} and beyond.
        </p>
      </Reveal>
    </section>
    <section className="premium-container marketing-grid stagger-children premium-scene">
      {SERVICE_DETAILS.map((service, index) => (
        <Reveal key={service.name} delay={index * 60} variant="fade-up" className="marketing-card premium-card premium-scene__item">
          <h2>{service.name}</h2>
          <p className="marketing-card-tag">{service.tagline}</p>
          <p>{service.description}</p>
        </Reveal>
      ))}
    </section>
    <CtaBanner title="Ready to elevate your brand?" subtitle="Talk to our studio or start from a template." primaryTo="/contact" primaryLabel="Contact Studio" />
  </main>
);

export const PricingPage = () => (
  <main className="marketing-page">
    <section className="marketing-hero premium-container">
      <Reveal>
        <span className="section-kicker">Pricing</span>
        <h1 className="section-title">Transparent print pricing</h1>
        <p className="marketing-lead">
          Estimate flex and substrate costs instantly. Final quotes may vary with finishing, quantity, and installation.
        </p>
      </Reveal>
    </section>
    <section className="premium-container marketing-pricing">
      <div className="marketing-pricing-table premium-card">
        <div className="marketing-pricing-head">
          <span>Material</span>
          <span>Rate</span>
        </div>
        {RATE_CARD_MATERIALS.map((row) => (
          <div key={row.name} className="marketing-pricing-row">
            <span>{row.name}</span>
            <strong>₹{row.price} / sq.ft</strong>
          </div>
        ))}
      </div>
      <p className="marketing-note">
        Need a custom quote? <Link to="/contact" className="premium-link">Contact us</Link> or use the rate calculator on the homepage.
      </p>
    </section>
    <CtaBanner primaryTo="/catalogue" primaryLabel="Browse Designs" secondaryTo="/templates" secondaryLabel="View Templates" />
  </main>
);

export const InspirationPage = () => (
  <main className="marketing-page">
    <section className="marketing-hero premium-container">
      <Reveal>
        <span className="section-kicker">Inspiration</span>
        <h1 className="section-title">Ideas that print beautifully</h1>
        <p className="marketing-lead">
          Explore how creators and businesses use YAMINI Flex for events, retail, and campaigns.
        </p>
      </Reveal>
    </section>
    <section className="premium-container marketing-steps">
      {HOW_IT_WORKS.map((step, index) => (
        <Reveal key={step.step} delay={index * 70} className="marketing-step premium-card">
          <span className="marketing-step-num">{step.step}</span>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
        </Reveal>
      ))}
    </section>
    <CtaBanner primaryTo="/templates" primaryLabel="Explore Templates" secondaryTo="/" secondaryLabel="Back to Home" />
  </main>
);
