const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const TRAILING_PUNCTUATION = /[),.;:!?]+$/;

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

module.exports = {
  splitLinkifiedText,
  normalizeHref,
};
