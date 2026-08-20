export const ROLE_GUIDES = {
  1: {
    title: 'Viewer',
    summary: 'You can open plans that were assigned to you. You do not manage the school’s plan or other users.',
    can: [
      'Open a plan the principal assigned to you',
      'Read sections you were given access to',
      'Sign in only with your @schools.nyc.gov account',
    ],
    cannot: [
      'Start a new school plan',
      'See every plan at the school unless it was assigned to you',
      'Add, edit, or delete users',
      'Submit or attest the plan',
    ],
    startHere: [
      'On Overview, open the plan listed for you.',
      'If you do not see a plan, ask your principal to assign you in Collaboration.',
    ],
  },
  2: {
    title: 'School staff',
    summary: 'You can work in your school’s plan. You cannot create a second plan or manage accounts.',
    can: [
      'Open the Consolidated School Plan for your school',
      'Edit answers and rely on autosave',
      'Paste Excel or Google Sheets tables into table questions without losing columns',
      'Compare last year with this year when the principal has both plans',
      'Export a copy if you have access to that plan',
    ],
    cannot: [
      'Start a new plan for this or another school',
      'Open plans from other schools',
      'Add or remove users, or change someone’s level',
      'Submit or attest — that stays with the principal',
    ],
    startHere: [
      'On Overview, open your school’s current-year plan.',
      'Update your sections. The principal submits when the school is ready.',
    ],
    showExcelTables: true,
  },
  3: {
    title: 'Assistant Principal',
    summary: 'You edit plans the principal assigned to you. You do not own the school plan or the user list.',
    can: [
      'Open and edit assigned school plans',
      'Work in the sections you were given, with autosave',
      'Paste Excel or Google Sheets tables into table questions without losing columns',
      'Collaborate with others who were also assigned',
      'Compare years and export when you have access',
    ],
    cannot: [
      'Start a new school plan',
      'See plans you were not assigned',
      'Manage school users or change levels',
      'Submit or attest the plan — the principal does that',
    ],
    startHere: [
      'On Overview, open an assigned plan.',
      'If the list is empty, ask the principal to share the plan with you under Collaboration.',
    ],
    showExcelTables: true,
  },
  4: {
    title: 'Principal',
    summary: 'You own your school’s plan and your school’s staff accounts (levels 1–3). District settings stay with Super Admin.',
    can: [
      'Open, edit, duplicate, attest, and submit your school’s plan',
      'Start a new plan for your school only',
      'Paste Excel or Google Sheets tables into table questions without losing columns',
      'Add and manage Assistant Principals and staff at your school (levels 1–3)',
      'Share the plan with level 3 staff for editing',
      'Compare years and export PDF or Word',
    ],
    cannot: [
      'Create a plan for a different school',
      'Edit or delete Super Admins or other principals',
      'Change district questions, goals, or the school-year calendar',
      'Approve or reject plans for the whole district',
    ],
    startHere: [
      'On Overview, open this year’s plan or duplicate last year’s.',
      'Use School users to add staff, then Collaboration to assign the plan.',
      'When every section is reviewed, submit. Copied plans also need your attestation.',
    ],
    showExcelTables: true,
  },
  5: {
    title: 'Super Admin',
    summary: 'You can see every school. Use Preview school roles to check what a principal or AP sees.',
    can: [
      'View and review plans across the district',
      'Manage users at any school, including principals',
      'Publish questions, set goals, and run year setup',
      'Set table columns to Text or Dropdown, then convert copied text lists into table rows from Year setup',
      'Preview the app as a principal or assistant principal',
    ],
    cannot: [
      'Sign in as another person’s Google account',
      'Skip attestation — principals still attest their own copied plans',
    ],
    startHere: [
      'Use Preview school roles on Overview to walk through a school’s workflow.',
      'Year setup is for next year’s settings, not for editing this year’s school answers.',
      'To allow Excel paste, set the question type to Table in Question bank, then publish.',
    ],
    showExcelTables: true,
    excelAdmin: true,
  },
};

export const EXCEL_TABLE_GUIDE = {
  title: 'Paste a table from Excel',
  summary:
    'Some questions use a table grid instead of a text box. You can paste a spreadsheet range and keep the rows and columns.',
  steps: [
    'Open the question that shows a table grid (not a large text box).',
    'In Excel or Google Sheets, select the range you want, including the header row if it has column names.',
    'Copy, then click anywhere in the table on the form and paste.',
    'Check that each column stayed in its own column. For dropdown columns, pick from the list if the pasted value did not match.',
    'Use Add row if you need more lines. Clear table if you pasted into the old text box first and want to start over.',
  ],
  notes: [
    'Pasting into a plain text box will flatten the table into one block of text. Use the grid.',
    'Do not paste into a single cell if you copied several columns — click the grid first, then paste.',
  ],
  adminSteps: [
    'In Question bank, edit the question and set Type to Table (Excel paste).',
    'Optional: add locked columns. Each column can be Text or Dropdown. Use “Name / Title / Email / Phone” for staff lists, or “Program / Grade / Timeline” for program tables.',
    'Publish so principals and staff see the grid on 2026-2027 draft plans.',
    'On Year setup, use Convert text lists into tables to preview copied answers, then save rows. Incomplete rows get a review flag.',
  ],
};

export function getRoleGuide(level) {
  return ROLE_GUIDES[Number(level)] || ROLE_GUIDES[1];
}
