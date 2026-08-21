/**
 * Parse freeform staff lists (2025-2026 textarea answers) into contact rows.
 * Emails and phones are extracted with deterministic regex first. Names and
 * titles use heuristics. Leftover text is always kept in unparsedNotes.
 */

const CONTACT_TABLE_HEADERS = ['Name', 'Title', 'Email', 'Phone', 'Notes/Raw Text'];

const CONTACT_TABLE_PRESET = CONTACT_TABLE_HEADERS.map((header) => ({
  header,
  type: 'text',
  options: [],
}));

/**
 * Practical RFC 5322 addr-spec (dot-atom or quoted local part, domain or literal).
 * @type {RegExp}
 */
const EMAIL_RE =
  /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi;

const PHONE_RE =
  /(?<!\d)(?:\+?1[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}(?:\s*(?:(?:ext\.?|x|extension)\s*)\d{1,6})?(?!\d)/gi;

const NAME_SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|esq\.?)$/i;

const TITLE_HINTS = [
  'assistant principal',
  'parent coordinator',
  'community coordinator',
  'attendance teacher',
  'guidance counselor',
  'school counselor',
  'crisis intervention counselor',
  'school psychologist',
  'social worker',
  'case manager',
  'foster care',
  'paraprofessional',
  'school aide',
  'principal',
  'counselor',
  'psychologist',
  'coordinator',
  'liaison',
  'teacher',
  'secretary',
  'director',
  'dean',
  'apa',
  'ap',
];

const TITLE_HINT_RE = new RegExp(
  `\\b(?:${TITLE_HINTS.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
);

function emptyContact() {
  return { name: '', title: '', email: '', phone: '', unparsedNotes: '' };
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function collapseSpaces(value) {
  return String(value || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+-\s+/g, ' - ')
    .trim()
    .replace(/^[-–,;:]+|[-–,;:]+$/g, '')
    .trim();
}

function stripBullet(value) {
  return collapseSpaces(String(value || '').replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ''));
}

function uniqueMatches(text, regex) {
  const found = [];
  const seen = new Set();
  const source = String(text || '');
  regex.lastIndex = 0;
  let match = regex.exec(source);
  while (match) {
    const raw = match[0];
    const key = raw.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      found.push({ raw, index: match.index, length: raw.length });
    }
    if (regex.lastIndex === match.index) regex.lastIndex += 1;
    match = regex.exec(source);
  }
  regex.lastIndex = 0;
  return found;
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const extMatch = raw.match(/(?:ext\.?|x|extension)\s*(\d{1,6})/i);
  const ext = extMatch ? extMatch[1] : '';
  let digits = digitsOnly(raw.replace(/(?:ext\.?|x|extension)\s*\d{1,6}/i, ''));
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return '';
  const pretty = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return ext ? `${pretty} x${ext}` : pretty;
}

function isEmail(value) {
  EMAIL_RE.lastIndex = 0;
  const match = String(value || '').trim().match(EMAIL_RE);
  EMAIL_RE.lastIndex = 0;
  return Boolean(match && match[0] === String(value).trim());
}

function isLikelyNameToken(token) {
  const word = String(token || '').replace(/[(),]/g, '');
  if (!word) return false;
  if (NAME_SUFFIX.test(word)) return true;
  if (/^[A-Z]\.?$/.test(word)) return true;
  return /^[A-Z][A-Za-z'.-]*$/.test(word) || /^[A-Z]{2,}$/.test(word);
}

function isLikelyPersonName(value) {
  const text = collapseSpaces(value);
  if (!text || isEmail(text) || TITLE_HINT_RE.test(text)) return false;
  if (/\d/.test(text)) return false;
  const words = text.split(' ').filter(Boolean);
  if (words.length < 2 || words.length > 6) return false;
  const meaningful = words.filter((word) => !/^(and|&)$/i.test(word));
  return meaningful.length >= 2 && meaningful.every(isLikelyNameToken);
}

function looksLikeTitle(value) {
  const text = collapseSpaces(value);
  if (!text) return false;
  if (TITLE_HINT_RE.test(text)) return true;
  if (/^[A-Za-z][A-Za-z /&-]{2,60}$/.test(text) && text.split(' ').length <= 8 && !isLikelyPersonName(text)) {
    return /counselor|worker|manager|principal|teacher|coordinator|liaison|dean|director|psychologist|secretary|aide|specialist/i.test(
      text
    );
  }
  return false;
}

function maskSpans(text, spans) {
  let masked = String(text || '');
  spans
    .slice()
    .sort((a, b) => b.index - a.index)
    .forEach((span) => {
      masked = `${masked.slice(0, span.index)}${' '.repeat(span.length)}${masked.slice(span.index + span.length)}`;
    });
  return masked;
}

function splitTitleAndLeftover(right) {
  const source = collapseSpaces(right);
  if (!source) return { title: '', leftover: '' };

  const sentence = source.match(/^([^.]+)\.\s+(.+)$/);
  if (sentence && looksLikeTitle(sentence[1])) {
    return { title: collapseSpaces(sentence[1]), leftover: collapseSpaces(sentence[2]) };
  }

  const atMatch = source.match(/^(.*?)\s+\bat\b\s+(.+)$/i);
  if (atMatch && looksLikeTitle(atMatch[1])) {
    return { title: collapseSpaces(atMatch[1]), leftover: collapseSpaces(atMatch[2]) };
  }

  if (looksLikeTitle(source)) return { title: source.replace(/\.$/, ''), leftover: '' };
  return { title: '', leftover: source };
}

function splitNameAndTitle(text) {
  const source = collapseSpaces(text);
  if (!source) return { name: '', title: '', leftover: '' };

  const dashParts = source.split(/\s+-\s+/);
  if (dashParts.length >= 2) {
    const left = collapseSpaces(dashParts[0]);
    const right = collapseSpaces(dashParts.slice(1).join(' - '));
    if (isLikelyPersonName(left)) {
      const split = splitTitleAndLeftover(right);
      if (split.title || split.leftover) {
        return { name: left, title: split.title, leftover: split.leftover };
      }
    }
  }

  const paren = source.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (paren && isLikelyPersonName(paren[1]) && looksLikeTitle(paren[2])) {
    return { name: collapseSpaces(paren[1]), title: collapseSpaces(paren[2]), leftover: '' };
  }

  const labeled = source.match(/^(title|role|position)\s*:\s*(.+)$/i);
  if (labeled) return { name: '', title: collapseSpaces(labeled[2]), leftover: '' };

  if (isLikelyPersonName(source)) return { name: source, title: '', leftover: '' };

  const commaParts = source.split(',').map(collapseSpaces).filter(Boolean);
  if (commaParts.length >= 2 && isLikelyPersonName(commaParts[0]) && looksLikeTitle(commaParts[1])) {
    return {
      name: commaParts[0],
      title: commaParts[1],
      leftover: commaParts.slice(2).join(', '),
    };
  }
  if (commaParts.length === 2 && commaParts[0].split(' ').length === 1 && commaParts[1].split(' ').length <= 3) {
    const flipped = `${commaParts[1]} ${commaParts[0]}`;
    if (isLikelyPersonName(flipped)) return { name: flipped, title: '', leftover: '' };
  }

  if (looksLikeTitle(source)) return { name: '', title: source, leftover: '' };

  return { name: '', title: '', leftover: source };
}

function parseChunk(chunk) {
  const original = stripBullet(chunk);
  if (!original) return null;

  const emails = uniqueMatches(original, EMAIL_RE);
  const phones = uniqueMatches(original, PHONE_RE)
    .map((item) => ({ ...item, normalized: normalizePhone(item.raw) }))
    .filter((item) => item.normalized);

  let remainder = maskSpans(original, [
    ...emails,
    ...phones.map((item) => ({ index: item.index, length: item.length })),
  ]);
  remainder = remainder.replace(/[<>]/g, ' ');
  remainder = collapseSpaces(remainder.replace(/\s+-\s+$/g, ''));

  const { name, title, leftover } = splitNameAndTitle(remainder);
  const notesParts = [];
  if (leftover) notesParts.push(leftover);
  if (emails.length > 1) notesParts.push(`Additional emails: ${emails.slice(1).map((item) => item.raw).join(', ')}`);
  if (phones.length > 1) notesParts.push(`Additional phones: ${phones.slice(1).map((item) => item.normalized).join(', ')}`);

  const record = {
    name,
    title,
    email: emails[0] ? emails[0].raw : '',
    phone: phones[0] ? phones[0].normalized : '',
    unparsedNotes: notesParts.join(' | '),
    confidence: 'low',
    rawSource: original,
  };

  if (!record.name && !record.title && !record.email && !record.phone) {
    record.unparsedNotes = original;
  } else if (!record.name && !record.title && leftover) {
    record.unparsedNotes = leftover;
  }

  record.confidence = scoreConfidence(record);
  if (record.confidence === 'low' && original && original !== record.unparsedNotes) {
    const extras = [record.unparsedNotes, original].filter(Boolean);
    record.unparsedNotes = [...new Set(extras)].join(' | ');
  }

  return record;
}

function scoreConfidence(record) {
  if (record.email && record.name) return 'high';
  if (record.phone && record.name) return 'high';
  if (record.name && record.title) return 'high';
  if (record.name && !record.unparsedNotes) return 'high';
  if (record.name || record.email || record.phone) return 'medium';
  return 'low';
}

function splitByEmails(text) {
  const emails = uniqueMatches(text, EMAIL_RE);
  if (emails.length < 2) return [text];
  const chunks = [];
  emails.forEach((email, index) => {
    const start = index === 0 ? 0 : emails[index - 1].index + emails[index - 1].length;
    const end = email.index + email.length;
    const piece = collapseSpaces(text.slice(start, end).replace(/^[,;/]+/, ''));
    if (piece) chunks.push(piece);
  });
  const tail = collapseSpaces(text.slice(emails[emails.length - 1].index + emails[emails.length - 1].length));
  if (tail) chunks.push(tail);
  return chunks;
}

function splitCommaPeople(text) {
  const source = collapseSpaces(text);
  if (!source.includes(',')) return [source];
  if (uniqueMatches(source, EMAIL_RE).length >= 2) return splitByEmails(source);

  const dashPattern =
    /[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,5}(?:\s+(?:Jr\.?|Sr\.?|II|III|IV))?\s*-\s*[^,]+(?=\s*,\s*[A-Z]|$)/g;
  const dashHits = source.match(dashPattern) || [];
  if (dashHits.length >= 2) return dashHits.map(collapseSpaces);

  const parts = source.split(',').map(collapseSpaces).filter(Boolean);
  if (parts.length >= 2 && parts.every(isLikelyPersonName)) return parts;
  return [source];
}

function splitAndPeople(text) {
  const source = collapseSpaces(text);
  if (!/\sand\s/i.test(source) || source.includes('@')) return [source];
  const parts = source.split(/\s+and\s+/i).map(collapseSpaces).filter(Boolean);
  if (parts.length === 2 && isLikelyPersonName(parts[0]) && isLikelyPersonName(parts[1])) return parts;
  return [source];
}

function splitPeople(text) {
  const normalized = cleanText(text);
  if (!normalized) return [];

  const fromLines = normalized
    .split(/\n+/)
    .flatMap((line) => line.split(';'))
    .map(stripBullet)
    .filter(Boolean);

  return fromLines.flatMap((line) => splitCommaPeople(line)).flatMap((line) => splitAndPeople(line));
}

function looksLikeContactColumns(columns) {
  const headers = (Array.isArray(columns) ? columns : [])
    .map((column) => String(column?.header || column || '').toLowerCase().replace(/[^a-z]/g, ''));
  if (!headers.length) return false;
  const has = (needle) => headers.some((header) => header.includes(needle));
  const hits = [has('name'), has('title') || has('role'), has('email'), has('phone'), has('note') || has('raw')].filter(
    Boolean
  ).length;
  return hits >= 2;
}

function headerKey(header) {
  return String(header || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function notesForExport(contact) {
  const leftover = collapseSpaces(contact?.unparsedNotes);
  const source = collapseSpaces(contact?.rawSource);
  if (source) return source;
  return leftover;
}

function valueForHeader(contact, header) {
  const key = headerKey(header);
  const parts = String(contact.name || '').split(/\s+/).filter(Boolean);
  if (key === 'name' || key === 'fullname') return contact.name || '';
  if (key === 'firstname') return parts[0] || '';
  if (key === 'lastname') return parts.slice(1).join(' ');
  if (key === 'title' || key === 'role' || key === 'position') return contact.title || '';
  if (key === 'email') return contact.email || '';
  if (key === 'phone' || key === 'telephone') return contact.phone || '';
  if (key.includes('note') || key.includes('raw') || key.includes('unparsed') || key.includes('source')) {
    return notesForExport(contact);
  }
  return '';
}

function parseContactsFromText(text) {
  const chunks = splitPeople(text);
  return chunks
    .map(parseChunk)
    .filter(Boolean)
    .filter((record) => record.name || record.title || record.email || record.phone || record.unparsedNotes);
}

function contactsToTable(contacts, { headers, columns } = {}) {
  const nextHeaders = Array.isArray(headers) && headers.length
    ? headers
    : Array.isArray(columns) && columns.length
      ? columns.map((column) => column.header || column)
      : CONTACT_TABLE_HEADERS;
  const rows = (contacts && contacts.length ? contacts : [emptyContact()]).map((contact) =>
    nextHeaders.map((header) => valueForHeader(contact, header))
  );
  return { headers: nextHeaders, rows };
}

function parseContactsAsTable(text, options = {}) {
  return contactsToTable(parseContactsFromText(text), options);
}

function mergeLlmEnrichment(parsed, enriched) {
  const extra = Array.isArray(enriched) ? enriched : [];
  return parsed.map((record, index) => {
    const next = extra[index] || {};
    return {
      name: record.name || String(next.name || '').trim(),
      title: record.title || String(next.title || '').trim(),
      email: record.email || (isEmail(next.email) ? String(next.email).trim() : ''),
      phone: record.phone || normalizePhone(next.phone),
      unparsedNotes: record.unparsedNotes || String(next.unparsedNotes || '').trim(),
      confidence: record.confidence,
      rawSource: record.rawSource,
    };
  });
}

async function parseContactsFromTextAsync(text, { llm } = {}) {
  const parsed = parseContactsFromText(text);
  if (typeof llm !== 'function') return parsed;
  try {
    const enriched = await llm(text, parsed);
    return mergeLlmEnrichment(parsed, enriched);
  } catch {
    return parsed;
  }
}

module.exports = {
  CONTACT_TABLE_HEADERS,
  CONTACT_TABLE_PRESET,
  EMAIL_RE,
  PHONE_RE,
  emptyContact,
  looksLikeContactColumns,
  parseContactsFromText,
  parseContactsFromTextAsync,
  parseContactsAsTable,
  contactsToTable,
  notesForExport,
  mergeLlmEnrichment,
  normalizePhone,
  isEmail,
  isLikelyPersonName,
};
