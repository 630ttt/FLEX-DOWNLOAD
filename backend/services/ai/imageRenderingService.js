const sharp = require('sharp');
const { inpaintTextElements } = require('./localTextInpaintingService');
const { resolveAvailableFont, measureText } = require('./fontResolverService');

const MAX_IMAGE_PIXELS = 50_000_000;

/*
|--------------------------------------------------------------------------
| Basic helpers
|--------------------------------------------------------------------------
*/

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const wrapText = (text, maxChars) => {
  const words = String(text)
    .split(/\s+/)
    .filter(Boolean);

  const lines = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;

    if (line && next.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
};

const wrapTextToWidth = ({ text, width, fontPath, fontSize, letterSpacing }) => {
  const paragraphs = String(text).split(/\r?\n/);
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measureText({ fontPath, text: candidate, fontSize, letterSpacing }) > width) {
        lines.push(line);
        line = word;
      } else if (!line && measureText({ fontPath, text: word, fontSize, letterSpacing }) > width) {
        let segment = '';
        for (const character of word) {
          const next = segment + character;
          if (segment && measureText({ fontPath, text: next, fontSize, letterSpacing }) > width) {
            lines.push(segment);
            segment = character;
          } else {
            segment = next;
          }
        }
        line = segment;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    if (!paragraph) lines.push('');
  }
  return lines.length ? lines : [''];
};

/*
|--------------------------------------------------------------------------
| Change / element helpers
|--------------------------------------------------------------------------
*/

const getChangeElementIds = (change) => {
  if (
    Array.isArray(change.elementIds) &&
    change.elementIds.length
  ) {
    return change.elementIds;
  }

  if (change.elementId) {
    return [change.elementId];
  }

  return [];
};

const getChangeElements = (change, elements) => {
  const byId = new Map(
    elements.map((element) => [element.id, element])
  );

  return getChangeElementIds(change)
    .map((id) => byId.get(id))
    .filter(Boolean)
    .filter((element) => element.type === 'text');
};

const getCombinedBoundingBox = (elements) => {
  if (!elements.length) {
    throw new Error(
      'No detected text elements found for replacement'
    );
  }

  const left = Math.min(
    ...elements.map((element) => element.bbox.x)
  );

  const top = Math.min(
    ...elements.map((element) => element.bbox.y)
  );

  const right = Math.max(
    ...elements.map(
      (element) =>
        element.bbox.x + element.bbox.width
    )
  );

  const bottom = Math.max(
    ...elements.map(
      (element) =>
        element.bbox.y + element.bbox.height
    )
  );

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

/*
|--------------------------------------------------------------------------
| Box normalization
|--------------------------------------------------------------------------
*/

const normalizeBox = (
  box,
  imageWidth,
  imageHeight,
  padding = 0
) => {
  const x = clamp(
    Math.floor(box.x - padding),
    0,
    imageWidth - 1
  );

  const y = clamp(
    Math.floor(box.y - padding),
    0,
    imageHeight - 1
  );

  const right = clamp(
    Math.ceil(
      box.x +
      box.width +
      padding
    ),
    x + 1,
    imageWidth
  );

  const bottom = clamp(
    Math.ceil(
      box.y +
      box.height +
      padding
    ),
    y + 1,
    imageHeight
  );

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
};

/*
|--------------------------------------------------------------------------
| Create replacement text SVG
|--------------------------------------------------------------------------
*/

const createTextBlock = ({
  element,
  box,
  text,
}) => {
  const originalFontSize = Math.max(9, Number(element.fontSize) || box.height * 0.72);
  const font = resolveAvailableFont(
    element.fontFamily,
    element.fontWeight || 400,
    element.fontStyle || 'normal'
  );
  const fontFamily = font.family;
  const fontPath = font.path;
  const letterSpacing = Number(element.letterSpacing) || 0;
  let fontSize = Math.min(originalFontSize, box.height * 0.9);
  let lineHeight = Number(element.lineHeight) || originalFontSize * 1.12;
  let lines = [];

  while (fontSize >= 8) {
    const scale = fontSize / originalFontSize;
    lineHeight = Math.max(fontSize, (Number(element.lineHeight) || originalFontSize * 1.12) * scale);
    lines = wrapTextToWidth({ text, width: box.width, fontPath, fontSize, letterSpacing });
    const widestLine = Math.max(...lines.map((line) => measureText({ fontPath, text: line, fontSize, letterSpacing })));
    if (widestLine <= box.width && lines.length * lineHeight <= box.height) break;
    fontSize -= 1;
  }

  if (!lines.length || lines.length * lineHeight > box.height) {
    throw new Error(`Replacement text for ${element.semanticType || 'text'} does not fit its detected region`);
  }

  const alignment =
    element.alignment || 'center';

  const anchor =
    alignment === 'left'
      ? 'start'
      : alignment === 'right'
        ? 'end'
        : 'middle';

  const textX =
    anchor === 'start'
      ? box.x
      : anchor === 'end'
        ? box.x + box.width
        : box.x + box.width / 2;

  const totalHeight =
    lines.length * lineHeight;

  const firstBaseline =
    box.y +
    (box.height - totalHeight) / 2 +
    fontSize;

  const fill =
    /^#[0-9a-f]{6}$/i.test(
      element.textColor || ''
    )
      ? element.textColor
      : '#ffffff';

  const fontWeight = String(element.fontWeight || 700);
  const fontStyle = ['italic', 'oblique'].includes(element.fontStyle) ? element.fontStyle : 'normal';
  const rotation = clamp(Number(element.rotation) || 0, -360, 360);
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const transform = rotation ? ` transform="rotate(${rotation} ${centerX} ${centerY})"` : '';
  const opacity = Number.isFinite(Number(element.textOpacity)) ? clamp(Number(element.textOpacity), 0, 1) : 1;
  const strokeColor = /^#[0-9a-f]{6}$/i.test(element.strokeColor || '') ? element.strokeColor : '';
  const strokeWidth = strokeColor ? clamp(Number(element.strokeWidth) || 0, 0, 100) : 0;
  const shadowColor = /^#[0-9a-f]{6}$/i.test(element.shadowColor || '') ? element.shadowColor : '';
  const shadowBlur = shadowColor ? clamp(Number(element.shadowBlur) || 0, 0, 100) : 0;
  const shadowOffsetX = shadowColor ? clamp(Number(element.shadowOffsetX) || 0, -200, 200) : 0;
  const shadowOffsetY = shadowColor ? clamp(Number(element.shadowOffsetY) || 0, -200, 200) : 0;
  const shadowId = `text-shadow-${String(element.id || 'element').replace(/[^a-z0-9_-]/gi, '')}`;
  const shadowFilter = shadowColor
    ? `<defs><filter id="${shadowId}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="${shadowBlur}" result="blur"/><feOffset in="blur" dx="${shadowOffsetX}" dy="${shadowOffsetY}" result="offset"/><feFlood flood-color="${shadowColor}" result="color"/><feComposite in="color" in2="offset" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    : '';
  const filter = shadowColor ? ` filter="url(#${shadowId})"` : '';
  const stroke = strokeColor && strokeWidth ? ` stroke="${strokeColor}" stroke-width="${strokeWidth}" paint-order="stroke fill"` : '';
  const letterSpacingAttribute = letterSpacing ? ` letter-spacing="${letterSpacing}"` : '';

  const tspans = lines
    .map(
      (line, index) =>
        `<tspan
          x="${textX}"
          y="${
            firstBaseline +
            index * lineHeight
          }"
        >${escapeXml(line)}</tspan>`
    )
    .join('');

  return `${shadowFilter}
    <text
      text-anchor="${anchor}"
      font-family="${escapeXml(fontFamily)}"
      font-size="${fontSize}"
      font-weight="${fontWeight}"
      font-style="${fontStyle}"
      line-height="${lineHeight}"
      opacity="${opacity}"
      fill="${fill}"
      ${letterSpacingAttribute}
      ${stroke}
      ${filter}
      ${transform}
    >
      ${tspans}
    </text>
  `;
};

/*
|--------------------------------------------------------------------------
| Build all replacement text
|--------------------------------------------------------------------------
*/

const getTextSvg = (
  width,
  height,
  elements,
  changes
) => {
  const blocks = [];

  for (const change of changes) {
    if (
      change.operation !==
        'replace_text' &&
      change.operation !==
        'replace_text_group'
    ) {
      continue;
    }

    const targetElements =
      getChangeElements(
        change,
        elements
      );

    if (!targetElements.length) {
      continue;
    }

    /*
     * Single text element.
     */
    if (
      change.operation ===
      'replace_text'
    ) {
      const element =
        targetElements[0];

      const box = normalizeBox(
        element.bbox,
        width,
        height,
        0
      );

      blocks.push(
        createTextBlock({
          element,
          box,
          text:
            change.newValue ||
            change.to ||
            '',
        })
      );

      continue;
    }

    /*
     * Multiple detected text elements.
     *
     * Example:
     *
     * Happy
     * Birthday
     * Eeshitha
     *
     * → Happy Birthday Yamini
     */
    if (
      change.operation ===
      'replace_text_group'
    ) {
      const combined =
        getCombinedBoundingBox(
          targetElements
        );

      const box = normalizeBox(
        combined,
        width,
        height,
        0
      );

      /*
       * Use the first element as the
       * typography reference.
       */
      const referenceElement =
        targetElements[0];

      blocks.push(
        createTextBlock({
          element:
            referenceElement,
          box,
          text:
            change.newValue ||
            change.to ||
            '',
        })
      );
    }
  }

  return Buffer.from(`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${width}"
      height="${height}"
    >
      ${blocks.join('\n')}
    </svg>
  `);
};

/*
|--------------------------------------------------------------------------
| Main renderer
|--------------------------------------------------------------------------
*/

const renderExactText = async ({
  imageBuffer,
  analysis,
  changes,
}) => {
  if (!Buffer.isBuffer(imageBuffer)) {
    throw new Error(
      'imageBuffer must be a Buffer'
    );
  }

  if (
    !analysis ||
    !Array.isArray(
      analysis.elements
    )
  ) {
    throw new Error(
      'Valid image analysis is required for text rendering'
    );
  }

  const metadata =
    await sharp(imageBuffer, {
      limitInputPixels:
        MAX_IMAGE_PIXELS,
    }).metadata();

  if (
    !metadata.width ||
    !metadata.height
  ) {
    throw new Error(
      'Edited design image has invalid dimensions'
    );
  }

  if (
    analysis.imageWidth &&
    metadata.width !==
      analysis.imageWidth
  ) {
    throw new Error(
      'Edited background width does not match the original design'
    );
  }

  if (
    analysis.imageHeight &&
    metadata.height !==
      analysis.imageHeight
  ) {
    throw new Error(
      'Edited background height does not match the original design'
    );
  }

  const textChanges =
    changes.filter(
      (change) =>
        change.operation ===
          'replace_text' ||
        change.operation ===
          'replace_text_group'
    );

  /*
   * Nothing to render.
   */
  if (!textChanges.length) {
    return imageBuffer;
  }

  // Reconstruct only pixels identified as original text glyphs.
  let result = await inpaintTextElements({
    imageBuffer,
    elements: analysis.elements,
    changes: textChanges,
  });

  const textSvg =
    getTextSvg(
      metadata.width,
      metadata.height,
      analysis.elements,
      textChanges
    );

  /*
   * ---------------------------------------------------------
   * STEP 5
   * Composite replacement text onto reconstructed image.
   * ---------------------------------------------------------
   */

  result =
    await sharp(result, {
      limitInputPixels:
        MAX_IMAGE_PIXELS,
    })
      .composite([
        {
          input: textSvg,
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

  /*
   * Final validation.
   */
  const finalMetadata =
    await sharp(result).metadata();

  if (
    finalMetadata.width !==
      metadata.width ||
    finalMetadata.height !==
      metadata.height
  ) {
    throw new Error(
      'Final rendered image dimensions changed unexpectedly'
    );
  }

  return result;
};

module.exports = {
  escapeXml,
  wrapText,
  getTextSvg,
  renderExactText,
};