import Reveal from '../Reveal';
import './ProcessTimeline.css';

const STEPS = [
  { num: '01', title: 'Choose a Design', detail: 'Browse templates and catalogue layouts tuned for print.' },
  { num: '02', title: 'Customize', detail: 'Personalize text, colors, and brand details in the studio.' },
  { num: '03', title: 'Preview', detail: 'Review proofs and approve before we print.' },
  { num: '04', title: 'Order', detail: 'Secure checkout with flexible pickup and dispatch.' },
  { num: '05', title: 'Get It Printed', detail: 'Studio-grade flex, vinyl, and finishing — delivered fast.' },
];

const ProcessTimeline = () => (
  <section className="premium-section process-timeline" id="how-it-works" aria-labelledby="process-title">
    <div className="premium-container">
      <Reveal>
        <span className="section-kicker">How it works</span>
        <h2 id="process-title" className="section-title">From idea to printed perfection</h2>
      </Reveal>

      <ol className="process-timeline__list">
        {STEPS.map((step, index) => (
          <Reveal key={step.num} delay={index * 70} as="li" className="process-timeline__step">
            <span className="process-timeline__num">{step.num}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </div>
  </section>
);

export default ProcessTimeline;
