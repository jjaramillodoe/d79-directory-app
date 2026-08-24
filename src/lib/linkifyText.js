const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const TRAILING_PUNCTUATION = /[),.;:!?]+$/;
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(\s*((?:https?:\/\/|www\.)[^\s)]+)\s*\)/gi;

function cleanUrlText(value) {
  return String(value || '').replace(/[\u200b\u200c\u200d\u00ad]/g, '');
}

function normalizeHref(urlText) {
  const trimmed = String(urlText || '').trim();
  if (!trimmed) return '';
  const href = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.href;
  } catch {
    return '';
  }
}

function clampRange(text, start, end) {
  const len = String(text ?? '').length;
  const from = Math.max(0, Math.min(Number(start) || 0, len));
  const to = Math.max(0, Math.min(Number(end) || 0, len));
  return from <= to ? [from, to] : [to, from];
}

function wrapSelectionAsBold(text, start, end) {
  const source = String(text ?? '');
  const [from, to] = clampRange(source, start, end);
  if (from === to) return { text: source, start: from, end: to };
  const wrapped = `**${source.slice(from, to)}**`;
  return {
    text: source.slice(0, from) + wrapped + source.slice(to),
    start: from,
    end: from + wrapped.length,
  };
}

function wrapSelectionAsLink(text, start, end, href, label) {
  const source = String(text ?? '');
  const [from, to] = clampRange(source, start, end);
  const selected = source.slice(from, to);
  const linkText = (selected || String(label || '')).trim();
  const safeHref = normalizeHref(href);
  if (!linkText || !safeHref) return { text: source, start: from, end: to };
  const wrapped = `[${linkText}](${safeHref})`;
  return {
    text: source.slice(0, from) + wrapped + source.slice(to),
    start: from,
    end: from + wrapped.length,
  };
}

function splitLinkifiedText(text) {
  const source = String(text ?? '');
  if (!source) return [];

  const parts = [];
  const regex = new RegExp(URL_PATTERN.source, 'gi');
  let lastIndex = 0;
  let match = regex.exec(source);

  while (match) {
    const raw = cleanUrlText(match[0]);
    const punctuation = raw.match(TRAILING_PUNCTUATION)?.[0] || '';
    const urlText = punctuation ? raw.slice(0, -punctuation.length) : raw;
    const href = normalizeHref(urlText);

    if (!href) {
      match = regex.exec(source);
      continue;
    }

    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: source.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'url', text: urlText, href });
    if (punctuation) {
      parts.push({ type: 'text', text: punctuation });
    }
    lastIndex = match.index + match[0].length;
    match = regex.exec(source);
  }

  if (lastIndex < source.length) {
    parts.push({ type: 'text', text: source.slice(lastIndex) });
  }

  return parts;
}

function splitMarkdownLinkSegments(source) {
  const segments = [];
  const linkRe = new RegExp(MARKDOWN_LINK_PATTERN.source, 'gi');
  let lastIndex = 0;
  let match = linkRe.exec(source);

  while (match) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: source.slice(lastIndex, match.index) });
    }
    const href = normalizeHref(match[2]);
    if (href) {
      segments.push({ kind: 'link', text: match[1], href });
    } else {
      segments.push({ kind: 'text', text: match[0] });
    }
    lastIndex = match.index + match[0].length;
    match = linkRe.exec(source);
  }

  if (lastIndex < source.length) {
    segments.push({ kind: 'text', text: source.slice(lastIndex) });
  }

  return segments;
}

function splitBoldChunks(source) {
  const chunks = [];
  const boldRe = new RegExp(BOLD_PATTERN.source, 'g');
  let lastIndex = 0;
  let match = boldRe.exec(source);

  while (match) {
    if (match.index > lastIndex) {
      chunks.push({ bold: false, text: source.slice(lastIndex, match.index) });
    }
    chunks.push({ bold: true, text: match[1] });
    lastIndex = match.index + match[0].length;
    match = boldRe.exec(source);
  }

  if (lastIndex < source.length) {
    chunks.push({ bold: false, text: source.slice(lastIndex) });
  }

  return chunks;
}

function splitFormattedText(text) {
  const source = String(text ?? '');
  if (!source) return [];

  return splitMarkdownLinkSegments(source).flatMap((segment) => {
    if (segment.kind === 'link') {
      return [{ type: 'url', text: segment.text, href: segment.href, bold: false }];
    }

    const chunks = splitBoldChunks(segment.text);
    if (!chunks.length) {
      return splitLinkifiedText(segment.text).map((part) => ({ ...part, bold: false }));
    }

    return chunks.flatMap((chunk) =>
      splitLinkifiedText(chunk.text).map((part) => ({
        ...part,
        bold: chunk.bold,
      }))
    );
  });
}

module.exports = {
  splitLinkifiedText,
  splitFormattedText,
  normalizeHref,
  wrapSelectionAsBold,
  wrapSelectionAsLink,
};
