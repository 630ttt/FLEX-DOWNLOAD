import { Link } from 'react-router-dom';
import { FaArrowRight, FaFont, FaImage, FaLayerGroup, FaMagic, FaShapes } from 'react-icons/fa';
import Reveal from '../Reveal';
import './DesignStudioFeature.css';

const FLOAT_FEATURES = [
  { label: '100+ Fonts', icon: FaFont },
  { label: 'HD Export', icon: FaLayerGroup },
  { label: 'AI Image Generation', icon: FaMagic },
  { label: 'Smart Frames', icon: FaShapes },
  { label: 'Drag & Drop', icon: FaImage },
  { label: 'Print Ready', icon: FaLayerGroup },
];

const TOOL_TAGS = ['Text', 'Images', 'Elements', 'Frames', 'Shapes', 'Backgrounds', 'Layers', 'Colors', 'Fonts', 'AI', 'Templates'];

export default function DesignStudioFeature() {
  return (
    <section className="studio-feature premium-section" aria-labelledby="studio-feature-title">
      <div className="premium-container studio-feature__grid">
        <Reveal variant="slide-right">
          <span className="section-kicker">Design your way</span>
          <h2 id="studio-feature-title" className="section-title">A studio built for print</h2>
          <p className="studio-feature__lead">
            The same YAMINI Flex editor you use for orders — templates, layers, elements, frames, and AI — in one
            professional workspace.
          </p>
          <Link to="/editor" className="btn-premium btn-premium--primary">
            Open Design Studio <FaArrowRight />
          </Link>
        </Reveal>

        <Reveal delay={120} variant="fade-up">
          <div className="studio-feature__mock premium-scene" aria-hidden="true">
            <div className="studio-feature__chrome">
              <div className="studio-feature__toolbar">
                <span />
                <span />
                <span />
                <span className="studio-feature__toolbar-title">YAMINI Flex · Editor</span>
              </div>
              <div className="studio-feature__body">
                <div className="studio-feature__rail">
                  {TOOL_TAGS.slice(0, 6).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <div className="studio-feature__canvas">
                  <div className="studio-feature__canvas-inner">
                    <p>Create. Customize. Print.</p>
                  </div>
                </div>
                <div className="studio-feature__props">
                  <span>Properties</span>
                  <div />
                  <div />
                </div>
              </div>
            </div>

            {FLOAT_FEATURES.map((item, index) => (
              <div
                key={item.label}
                className="studio-feature__pill premium-scene__item"
                style={{ '--pill-i': index }}
              >
                <item.icon aria-hidden="true" />
                {item.label}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
