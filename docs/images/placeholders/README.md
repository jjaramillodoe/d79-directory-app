# Screenshots needed

The MDX pages carry no images yet. Each spot is marked in source with an MDX comment:

```mdx
{/* Screenshot needed: Alt text — what to capture. */}
```

Replacing one means dropping a capture into this directory and swapping the comment for
a normal image embed:

```mdx
![Alt text](/images/placeholders/your-capture.png)
```

Outstanding captures:

- `api/admin.mdx` — **Admin submissions**: /admin/submissions with school-year filter and CSV export control.
- `api/users.mdx` — **User admin**: /admin/users with sortable Once UI table, level filter, school column, and bulk import.
- `architecture/data-flow.mdx` — **Form workspace**: FormWorkspace with section nav, autosave (“Editing · Saved 2:14 PM”), lock indicator, and attestation on a copied 2026-2027 plan.
- `architecture/overview.mdx` — **System architecture**: Add diagram showing browser → Next.js App Router → NextAuth/Google → API routes → Mongoose → MongoDB, with optional Redis for step locks, cache, and save rate limits.
- `architecture/ui.mdx` — **About page**: the About page using the same portal header/footer as Home, with required sections listed from formQuestions.json.
- `authentication.mdx` — **Sign-in rejection**: the login error when the Google account is not pre-registered or is not a DOE email.
- `database/models.mdx` — **Schema map**: Add ER-style diagram: User 1—n FormSubmission, FormSubmission 1—n FormComment, FormTemplate versions, SchoolYearSettings per year, AuditLog.
- `deploy/environment.mdx` — **Vercel env UI**: Vercel environment variables for MONGODB_URI, NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIS_URL, SENTRY_DSN.
- `deploy/operations.mdx` — **Rollover confirmation**: rollover result counts (created, skipped, errors) and the archived-year tag on 2025-2026 forms.
- `deploy/production.mdx` — **Vercel deployment**: a successful Vercel production deployment for d79-directory-app.
- `features/collaboration.mdx` — **Share modal**: the collaboration share UI with view/edit permissions and optional section assignment.
- `features/audit-logs.mdx` — **System audit logs**: /admin/logs with Show Filters open, action dropdown, date range, and the Timestamp / User / Action / Details / IP table.
- `features/question-bank.mdx` — **Question bank admin**: /admin/questions with draft vs published, add step, reorder, and Publish.
- `features/question-bank.mdx` — **Table columns editor**: /admin/questions table type with Staff contact preset, column blueprint textarea, and Text vs Dropdown per column.
- `features/reviews-exports.mdx` — **Review comments**: a Super Admin comment on a step and the principal dashboard Comments view.
- `features/role-preview.mdx` — **Preview school roles**: Add screenshot of the Overview Preview school roles card and the yellow impersonation banner.
- `features/roles.mdx` — **Dashboard by role**: Super Admin sidebar (Submissions, Users, Goals, Question bank, System, Audit logs, Year setup) versus a principal sidebar.
- `features/school-plans.mdx` — **Step navigator**: FormWorkspace: school + year header, section list with completion checks, quiet question cards, sticky Previous/Next, and autosave status.
- `features/school-plans.mdx` — **Table question**: a GenericFormStep table with staff-contact headers, Add row, and the Excel-paste hint.
- `features/school-year.mdx` — **Year setup**: Super Admin Year setup (dashboard ?view=bulk-create) with rollover controls, archive toggle, deadlines, and pinned question-bank version.
- `features/system.mdx` — **System health**: /admin/system with API, MongoDB, and Redis cards, overall health tag, and Flush caches.
- `introduction.mdx` — **District 79 Directory homepage**: the public portal homepage with year tags, Sign in, and the live district snapshot.
- `quickstart.mdx` — **Login screen**: the Google sign-in card and the @schools.nyc.gov restriction notice.
