const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseContactsFromText,
  parseContactsFromTextAsync,
  parseContactsAsTable,
  contactsToTable,
  CONTACT_TABLE_HEADERS,
  normalizePhone,
  isEmail,
} = require('./contactTextParser');

test('empty and whitespace input returns no contacts', () => {
  assert.deepEqual(parseContactsFromText(''), []);
  assert.deepEqual(parseContactsFromText('   \n  '), []);
});

test('single name with no other fields', () => {
  const [row] = parseContactsFromText('Jane Doe');
  assert.equal(row.name, 'Jane Doe');
  assert.equal(row.title, '');
  assert.equal(row.email, '');
  assert.equal(row.phone, '');
  assert.equal(row.unparsedNotes, '');
});

test('name with suffix', () => {
  const [row] = parseContactsFromText('Alex Rivera Jr');
  assert.equal(row.name, 'Alex Rivera Jr');
});

test('comma-separated name and title pairs', () => {
  const rows = parseContactsFromText(
    'Tamara Julien - Case Manager, Iraina Slayton - Case Manager, Love Thornton - Case Manager'
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].name, 'Tamara Julien');
  assert.equal(rows[0].title, 'Case Manager');
  assert.equal(rows[2].name, 'Love Thornton');
  assert.equal(rows[2].title, 'Case Manager');
});

test('one name per line without titles', () => {
  const rows = parseContactsFromText('Rena Feiner\nShaniqua Schloss\nCharles Edwards\nDimitra Munoz');
  assert.equal(rows.length, 4);
  assert.equal(rows[1].name, 'Shaniqua Schloss');
  assert.ok(rows.every((row) => row.title === '' && row.email === ''));
});

test('multiline name - title at school puts location in notes', () => {
  const rows = parseContactsFromText(
    'Natasha Fortune - Guidance Counselor at Royal Academy\nNicole Smith - Guidance Counselor at Jamaica Academy'
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'Natasha Fortune');
  assert.equal(rows[0].title, 'Guidance Counselor');
  assert.equal(rows[0].unparsedNotes, 'Royal Academy');
  assert.equal(rows[1].name, 'Nicole Smith');
  assert.equal(rows[1].unparsedNotes, 'Jamaica Academy');
});

test('comma-separated name and email list', () => {
  const rows = parseContactsFromText(
    'James Petty - jpetty@schools.nyc.gov, Michael Pollicino - mpollic@schools.nyc.gov, John Mazzocchi - jmazzoc@schools.nyc.gov'
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].name, 'James Petty');
  assert.equal(rows[0].email, 'jpetty@schools.nyc.gov');
  assert.equal(rows[2].name, 'John Mazzocchi');
  assert.equal(rows[2].email, 'jmazzoc@schools.nyc.gov');
});

test('entry missing email and phone still keeps name and title', () => {
  const [row] = parseContactsFromText('Laura Marquez - Assistant Principal');
  assert.equal(row.name, 'Laura Marquez');
  assert.equal(row.title, 'Assistant Principal');
  assert.equal(row.email, '');
  assert.equal(row.phone, '');
});

test('phone formats normalize to a US number and keep extension', () => {
  const [row] = parseContactsFromText('Pat Lee, Teacher, (718) 555-0199 ext. 12');
  assert.equal(row.name, 'Pat Lee');
  assert.equal(row.title, 'Teacher');
  assert.equal(row.phone, '(718) 555-0199 x12');
  assert.equal(normalizePhone('1-718-555-0199'), '(718) 555-0199');
  assert.equal(normalizePhone('718.555.0199'), '(718) 555-0199');
});

test('school years are not parsed as phone numbers', () => {
  const [row] = parseContactsFromText('Review staffing for 2025-2026');
  assert.equal(row.phone, '');
  assert.match(row.unparsedNotes || row.name, /2025-2026/);
});

test('narrative leftover is preserved in unparsedNotes', () => {
  const [row] = parseContactsFromText(
    'Jordan Blake - Social Worker. Also handles foster care ATS updates for the campus.'
  );
  assert.equal(row.name, 'Jordan Blake');
  assert.equal(row.title, 'Social Worker');
  assert.match(row.unparsedNotes, /foster care ATS updates/i);
});

test('RFC-style emails including plus tags', () => {
  assert.equal(isEmail('principal+alc@schools.nyc.gov'), true);
  const [row] = parseContactsFromText('Sam Ortiz - principal+alc@schools.nyc.gov');
  assert.equal(row.email, 'principal+alc@schools.nyc.gov');
  assert.equal(row.name, 'Sam Ortiz');
});

test('full line with name title email and phone', () => {
  const [row] = parseContactsFromText(
    'Morgan Chen, Guidance Counselor, mchen2@schools.nyc.gov, 347-555-0100'
  );
  assert.equal(row.name, 'Morgan Chen');
  assert.equal(row.title, 'Guidance Counselor');
  assert.equal(row.email, 'mchen2@schools.nyc.gov');
  assert.equal(row.phone, '(347) 555-0100');
});

test('bullet list and semicolon separators', () => {
  const rows = parseContactsFromText('- Avery Quinn - Teacher\n• Riley Patel - Dean; Casey Ng - Liaison');
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => row.name),
    ['Avery Quinn', 'Riley Patel', 'Casey Ng']
  );
});

test('two names joined with and', () => {
  const rows = parseContactsFromText('Jane Doe and John Smith');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'Jane Doe');
  assert.equal(rows[1].name, 'John Smith');
});

test('low-confidence paragraph keeps the original text in notes', () => {
  const [row] = parseContactsFromText(
    'Staff will continue last year’s child abuse prevention outreach and update the poster locations in the main office.'
  );
  assert.ok(row.unparsedNotes.includes('poster locations'));
  assert.equal(row.email, '');
});

test('contactsToTable uses Name Title Email Phone Notes headers', () => {
  const table = parseContactsAsTable('Ada Gomez - Counselor, ada.gomez@schools.nyc.gov');
  assert.deepEqual(table.headers, CONTACT_TABLE_HEADERS);
  assert.equal(table.rows.length, 1);
  assert.equal(table.rows[0][0], 'Ada Gomez');
  assert.equal(table.rows[0][1], 'Counselor');
  assert.equal(table.rows[0][2], 'ada.gomez@schools.nyc.gov');
});

test('custom First Name / Last Name columns split the parsed name', () => {
  const table = contactsToTable(parseContactsFromText('Ada Gomez - Counselor'), {
    headers: ['First Name', 'Last Name', 'Title', 'Email', 'Phone', 'Notes/Raw Text'],
  });
  assert.equal(table.rows[0][0], 'Ada');
  assert.equal(table.rows[0][1], 'Gomez');
  assert.equal(table.rows[0][2], 'Counselor');
});

test('LLM enrichment fills name/title but cannot override regex email', async () => {
  const rows = await parseContactsFromTextAsync('mystery person abc.xyz@schools.nyc.gov', {
    llm: async () => [
      {
        name: 'Chris Hall',
        title: 'Teacher',
        email: 'spoof@example.com',
        phone: '',
        unparsedNotes: '',
      },
    ],
  });
  assert.equal(rows[0].name, 'Chris Hall');
  assert.equal(rows[0].title, 'Teacher');
  assert.equal(rows[0].email, 'abc.xyz@schools.nyc.gov');
});

test('failed LLM enricher falls back to deterministic parse', async () => {
  const rows = await parseContactsFromTextAsync('Jamie Fox - Dean', {
    llm: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(rows[0].name, 'Jamie Fox');
  assert.equal(rows[0].title, 'Dean');
});

test('table render fallback parses leftover textarea strings into contact columns', () => {
  const { normalizeTable } = require('./tableAnswer');
  const table = normalizeTable('Sam Ortiz - Teacher, sortiz@schools.nyc.gov', {
    columns: CONTACT_TABLE_HEADERS.map((header) => ({ header, type: 'text', options: [] })),
  });
  assert.equal(table.rows[0][0], 'Sam Ortiz');
  assert.equal(table.rows[0][1], 'Teacher');
  assert.equal(table.rows[0][2], 'sortiz@schools.nyc.gov');
});
