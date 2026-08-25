function lineKind(line) {
  const trimmed = String(line || '').trim();
  if (/^[-•]\s+/.test(trimmed)) return 'ul';
  if (/^\d+[.)]\s+/.test(trimmed)) return 'ol';
  return 'p';
}

function stripListMarker(line, kind) {
  const trimmed = String(line || '').trim();
  if (kind === 'ul') return trimmed.replace(/^[-•]\s+/, '');
  if (kind === 'ol') return trimmed.replace(/^\d+[.)]\s+/, '');
  return trimmed;
}

function classifyLines(lines) {
  const blocks = [];
  let buffer = [];
  let mode = null;

  const flush = () => {
    if (!buffer.length) return;
    if (mode === 'ul' || mode === 'ol') {
      blocks.push({
        type: mode,
        items: buffer.map((line) => stripListMarker(line, mode)),
      });
    } else {
      blocks.push({ type: 'p', text: buffer.join('\n') });
    }
    buffer = [];
    mode = null;
  };

  lines.forEach((line) => {
    const kind = lineKind(line);
    if (kind !== mode) flush();
    mode = kind;
    buffer.push(kind === 'p' ? line.replace(/\s+$/, '') : line);
  });
  flush();
  return blocks;
}

function splitCopyBlocks(text) {
  const source = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (!source) return [];
  return source.split(/\n{2,}/).flatMap((paragraph) => {
    const lines = paragraph
      .split('\n')
      .map((line) => line.replace(/\s+$/, ''))
      .filter((line) => line.length);
    if (!lines.length) return [];
    return classifyLines(lines);
  });
}

module.exports = {
  splitCopyBlocks,
};
