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
  },
  3: {
    title: 'Assistant Principal',
    summary: 'You edit plans the principal assigned to you. You do not own the school plan or the user list.',
    can: [
      'Open and edit assigned school plans',
      'Work in the sections you were given, with autosave',
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
  },
  4: {
    title: 'Principal',
    summary: 'You own your school’s plan and your school’s staff accounts (levels 1–3). District settings stay with Super Admin.',
    can: [
      'Open, edit, duplicate, attest, and submit your school’s plan',
      'Start a new plan for your school only',
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
  },
  5: {
    title: 'Super Admin',
    summary: 'You can see every school. Use Preview school roles to check what a principal or AP sees.',
    can: [
      'View and review plans across the district',
      'Manage users at any school, including principals',
      'Publish questions, set goals, and run year setup',
      'Preview the app as a principal or assistant principal',
    ],
    cannot: [
      'Sign in as another person’s Google account',
      'Skip attestation — principals still attest their own copied plans',
    ],
    startHere: [
      'Use Preview school roles on Overview to walk through a school’s workflow.',
      'Year setup is for next year’s settings, not for editing this year’s school answers.',
    ],
  },
};

export function getRoleGuide(level) {
  return ROLE_GUIDES[Number(level)] || ROLE_GUIDES[1];
}
