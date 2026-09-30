export const parseTesseractTsv = (tsv, scale = 1, minimumConfidence = 18) => {
  const groups = new Map();
  const rows = String(tsv || '').split(/\r?\n/).slice(1);
  for (const row of rows) {
    const columns = row.split('\t');
    if (columns[0] !== '5') continue;
    const confidence = Number(columns[10]);
    const text = columns.slice(11).join('\t').trim();
    if (!Number.isFinite(confidence) || confidence < minimumConfidence || !/[a-z\d]{2}/i.test(text)) continue;
    const left = Number(columns[6]);
    const top = Number(columns[7]);
    const width = Number(columns[8]);
    const height = Number(columns[9]);
    if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) continue;
    const key = columns.slice(2, 5).join(':');
    const group = groups.get(key) || {
      words: [],
      confidenceTotal: 0,
      confidenceCount: 0,
      left,
      top,
      right: left + width,
      bottom: top + height,
    };
    group.words.push(text);
    group.confidenceTotal += confidence;
    group.confidenceCount += 1;
    group.left = Math.min(group.left, left);
    group.top = Math.min(group.top, top);
    group.right = Math.max(group.right, left + width);
    group.bottom = Math.max(group.bottom, top + height);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      text: group.words.join(' '),
      confidence: Math.round(group.confidenceTotal / group.confidenceCount),
      bbox: {
        x: group.left / scale,
        y: group.top / scale,
        width: (group.right - group.left) / scale,
        height: (group.bottom - group.top) / scale,
      },
    }))
    .sort((left, right) => left.bbox.y - right.bbox.y || left.bbox.x - right.bbox.x)
    .slice(0, 40);
};