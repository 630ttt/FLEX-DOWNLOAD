import {
  FaFont,
  FaImage,
  FaLayerGroup,
  FaShapes,
  FaThLarge,
  FaUpload,
  FaVectorSquare,
  FaBorderAll,
} from 'react-icons/fa';
import './EditorToolRail.css';

const CUSTOMER_TOOLS = [
  { id: 'templates', label: 'Templates', icon: FaThLarge },
  { id: 'text', label: 'Text', icon: FaFont },
  { id: 'photos', label: 'Photos', icon: FaImage },
  { id: 'elements', label: 'Elements', icon: FaShapes },
  { id: 'frames', label: 'Frames', icon: FaBorderAll },
  { id: 'background', label: 'Background', icon: FaVectorSquare },
  { id: 'uploads', label: 'Uploads', icon: FaUpload },
  { id: 'layers', label: 'Layers', icon: FaLayerGroup },
];

const ADMIN_EXTRA = [
  { id: 'shapes', label: 'Shapes', icon: FaShapes },
];

export default function EditorToolRail({ mode = 'customer', activeTool, onSelect, vertical = true }) {
  const tools = mode === 'admin' ? [...CUSTOMER_TOOLS.slice(0, 6), ...ADMIN_EXTRA, ...CUSTOMER_TOOLS.slice(6)] : CUSTOMER_TOOLS;

  return (
    <nav
      className={`editor-tool-rail${vertical ? ' editor-tool-rail--vertical' : ''}`}
      aria-label="Design tools"
    >
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            type="button"
            className={`editor-tool-rail__btn${activeTool === tool.id ? ' is-active' : ''}`}
            title={tool.label}
            aria-label={tool.label}
            aria-current={activeTool === tool.id ? 'true' : undefined}
            onClick={() => onSelect(tool.id)}
          >
            <Icon aria-hidden="true" />
            <span>{tool.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
