# Codebase Audit — d79-directory

**Date**: August 26, 2026
**Commit**: `fa5b792`
**Scope**: Full repository, read-only static analysis plus live `npm audit`

---

## 1. Executive Summary

**Project**: `d79-directory` — NYC District 79 Consolidated School Plan management system. Next.js 16.2.7 (App Router), React 19, MongoDB/Mongoose, NextAuth v4 (Google OAuth, JWT strategy), Redis (ioredis), deployed on Vercel.

**Scale**: 205 files under `src/`, ~29,250 lines of application JS across 143 files in `src/app` + `src/components`, 47 API route handlers, 6 Mongoose models.

### Health check

| Dimension | Grade | Note |
|---|---|---|
| Authentication | Strong | Google OAuth with PKCE/state/nonce, domain restriction, DB-backed allowlist, JWT deny-list on logout |
| Authorization | **Weak** | Edge gate is solid; per-object checks are inconsistent and several routes have none |
| Secret handling | Strong | No secrets tracked in git; `.env*` correctly ignored by both git and Vercel |
| Dependencies | **Weak** | 18 advisories: 2 critical, 12 high |
| Frontend architecture | Fair | Good abstractions exist but aren't consistently used; one 2,083-line page |
| Performance | Fair | No code splitting, all pages client-rendered, one wasted DB connection pool |
| Code quality tooling | **Weak** | No ESLint installed, `next lint` is broken, no type checking on JS |
| Testing | **Weak** | 50 unit tests covering 6 of 29 lib modules; zero API, component, or E2E tests; no CI |

### Major strengths

- **Real security headers.** `next.config.js:55-83` sets CSP, HSTS with preload, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, and Permissions-Policy. This is well above average.
- **Defense in depth on session checks.** 45 of 47 routes independently call `getServerSession(authOptions)` rather than trusting the edge middleware alone.
- **Thoughtful session lifecycle.** `src/lib/auth.js` re-syncs user level/active state from the DB every 15 minutes, revokes tokens by `jti` on sign-out, and gates impersonation to level-5 actors targeting level-<5 users.
- **Fail-closed rate limiting in production** for auth and admin endpoints (`src/lib/userAccess.js:12-25`, `src/proxy.js:51-56`).
- **No XSS surface.** Zero `dangerouslySetInnerHTML` occurrences in `src/`; user content flows through React text nodes via `LinkifiedText` / `FormattedCopy`. `linkifyText` explicitly blocks `javascript:` URLs and is unit-tested.
- **Good server/client boundary for heavy libs.** `pdfkit`, `fontkit`, and `docx` stay server-side and are externalized in `next.config.js:14`.

### Top critical priorities

1. **Fix `PUT /api/users/[id]/permissions`** — unvalidated `$set` of a caller-supplied object onto any user by ID, with no target-scoping. This is a privilege-escalation hole waiting to open (see 2.2.1).
2. **Add object-level authorization to `attest`, `review-flag`, and `editors/register`** — these mutate forms with no ownership or school check at all.
3. **Scope `/api/admin/reports`, `/api/admin/timeline`, and `/api/users/audit-logs` to the caller's school** — a single school principal can currently export district-wide PII.
4. **Run `npm audit fix` and plan the `jspdf` v3→v4 major bump.** The Next.js advisory list includes a *middleware/proxy bypass* — and `src/proxy.js` is the foundation of the entire authorization model.
5. **Install ESLint.** There is currently no linter at all, and `npm run lint` exits 1.

### Remediation log

A first pass of authorization fixes landed on August 26, 2026, after the audit was written. Findings below are annotated **RESOLVED** where applicable; the rest of each finding is preserved as the original record.

Resolved:

- 2.2.2 cross-school attestation, 2.2.3 unauthenticated flag clearing, 2.2.7 `editors/register` — all three now call `canEditForm`.
- 2.2.5 policy divergence — consolidated into a new `src/lib/formAccess.js` (15 unit tests) and adopted by 8 routes. **Policy decision: levels 2-4 get edit access to their own school's plan**, since there is exactly one plan per school per year, so school membership is equivalent to plan assignment. Level 1 still requires an explicit assignment or share.
- 2.2.6 hardcoded email backdoor — removed from all three handlers in `share/route.js` plus the client-side gate at `src/app/form/[id]/page.js:1837`.
- 4.4 PII in the 403 response — the `details` block and the verbose `console.warn` payload are gone.
- 2.1.3 step-save rate limit now passes `failClosed: productionFailClosed()`.

**New finding discovered during remediation (not in the original audit):** the permission blocks in `step/[stepNumber]`, `editors`, and `locks` were reading `form.editAccess` and `form.assignedTo` — **neither field exists on any Mongoose schema**, so both checks silently evaluated to `false` and the collaboration grant they were meant to implement never worked. The real mechanism is `user.assignedForms` on the User model. `formAccess.js` uses that field, so assignment-based access now functions for the first time. This also means shared-edit users previously saw `userPermission: 'view'` from `GET /api/forms/[id]` while `PUT` would have accepted their writes; the helper reports `'edit'` consistently now.

#### Second pass — August 26, 2026

Resolved:

- **2.2.1 `permissions` route** — deleted `src/app/api/users/[id]/permissions/route.js` outright rather than repairing it. The admin UI's `handlePermissionUpdate` now posts to `PUT /api/users`, which already enforces `canManageTarget`, the "never assign at or above your own level" rule, the level-3 ceiling for non-super-admins, school confinement, and audit logging. Fixing the old route in place would have meant duplicating all five of those guards.
- **2.2.4 district-wide PII reads** — `admin/reports` and `admin/timeline` now scope through a new `schoolScopeFilter(actor)` in `userAccess.js`; `users/audit-logs` scopes by the actor's school roster because audit rows carry no school of their own. All three previously returned every school's data to any level-4 principal.
- **`admin/forms/share` GET** — added the same-school check that `POST` and `DELETE` already had, so a principal can no longer enumerate another school's collaborator list.
- **`admin/users/school` POST** — a Super Admin could mint another Super Admin. Creation is now capped below the actor's own level, and the level string is validated as an integer 1–5.
- **Export rate limiting** — `export/pdf` and `export/docx` at 10/min per user, district `admin/forms/export` at 5/min. PDF and DOCX also now use `canViewForm` instead of their own fourth and fifth copies of the permission logic.
- **`npm audit`** — clean. 17 advisories cleared by `npm audit fix` (`next` to 16.3.3, including the middleware/proxy bypass that mattered most given `src/proxy.js`; `next-auth` to 4.24.15). `jspdf` was then taken 3→4.2.1 to clear the last critical; the app only touches `addImage`, `addPage`, `save`, and `internal.pageSize`, none of which changed in v4, and none of the ten jsPDF advisories (AcroForm, `addJS`, BMP/GIF decoders, HTML injection) touch code paths this app uses. **`npm audit` now reports 0 vulnerabilities.**

**Second new finding (not in the original audit):** the "User Permissions" panel in `src/app/admin/users/page.js` offered three checkboxes — Can Edit Users, Can Delete Users, Can Manage Permissions — writing to `canEditUsers`, `canDeleteUsers`, and `canManagePermissions`. **None of those three fields exists on the User schema**, so Mongoose's strict mode silently discarded every write and the checkboxes always rendered unchecked. This was worse than dead UI: it told an administrator they had granted or revoked a capability when nothing had been persisted, and the app has no such capability model in the first place (authorization is purely level-based). The panel and the matching dead `permissionData` state are removed.

Also fixed while in these files: the Professional Title input fired a PUT on every keystroke against a `value`-controlled field that only updated after a server round-trip, making it nearly untypable — now `onBlur` and only when the value actually changed. `AuditLog` gained a shared `buildQuery`, because the list and its total count were built from different query shapes and `countDocuments` was being handed `startDate`/`endDate` as if they were schema fields, so pagination totals were wrong. `users/audit-logs` also stopped returning `error.message` to the client, and `admin/timeline` lost a full-collection `countDocuments` that ran on every request and threw its result away.

#### Third pass — August 26, 2026

Resolved:

- **ESLint installed, and it immediately found a live crash.** `BarChart3` was used twice in the Audit Log modal in `src/app/admin/users/page.js` but never imported, so opening that modal threw `BarChart3 is not defined`. This is the single best argument for the linter: the bug was in shipped code and cost one line to fix.
- **`isTokenDenied` no longer fails open** — see the note below, because the obvious fix here is dangerous.
- **`formAccess` adoption completed.** `compare` now uses `canViewForm`; it previously granted view to *any* same-school user including level-1 viewers, who are supposed to need an explicit assignment. `duplicate` keeps its stricter principal-and-above rule but now derives it by narrowing `canEditForm` rather than restating the policy, so it cannot drift.
- **Authorization matrix test suite** — `src/lib/formAccessMatrix.test.js` pins all 5 levels × {owner, not owner} × {same school, other school} as an explicit table, plus overlays for assignment, email share, and `principalEmail`. The suite fails if a combination is missing or duplicated, so the table cannot silently stop being exhaustive. Test count went from 65 to 95.
- **CI** — `.github/workflows/ci.yml` runs test, lint, build, and a production-only `npm audit` on every pull request. All four steps were verified locally against the same environment the workflow provides.
- The `test` script now globs `src/lib/*.test.js` instead of listing files, which is what let the two new suites run without a further edit.

**On failing closed, and why the obvious version of this fix is a self-inflicted outage:** `getRedis()` returns `null` in two completely different situations — `REDIS_URL` is unset, or Redis is configured but unreachable. Making `isTokenDenied` simply `return true` when Redis is missing would sign out every user of any deployment that runs without Redis, permanently, including local development. The implemented version separates the two: no `REDIS_URL` means there is no revocation list to consult and nothing is denied, while a *configured but unreachable* Redis denies in production only. Command errors are caught and treated the same way, since previously an exception from `redis.exists()` propagated into middleware as a 500. `src/lib/redisFailClosed.test.js` specifically asserts that a Redis-less production environment denies nothing, because that is the regression that would take the app down. Note the deliberate consequence: in production, a Redis outage now signs users out rather than honouring logouts that may already have happened.

**On the ESLint severity choices**, since these are judgement calls rather than defaults. `react/no-unescaped-entities` is off: it produced 28 findings and not one was a defect, as apostrophes in JSX text render correctly. The three React Compiler rule families (`set-state-in-effect`, `immutability`, `purity`, ~60 findings) are warnings rather than errors, because each fix is a component refactor concentrated in exactly the oversized page components this audit already flags for splitting, and gating CI on them on day one would have meant either a broken pipeline or a blanket disable. They stay visible in every lint run and in CI output. `npm run lint` currently exits 0 with 80 warnings and 0 errors; the intent is to burn the warnings down and promote those rules back to errors.

Two notes on the tooling. ESLint is pinned to 9.x: `eslint-config-next` 16.x ships a parser that ESLint 10 rejects outright with `scopeManager.addGlobals is not a function`. And `@eslint/eslintrc` turned out to be unnecessary, as `eslint-config-next` 16 exports a native flat config array.

#### Fourth pass — August 26, 2026 (verified defects)

Resolved:

- **`refreshLock` lock-stealing bug** — `src/lib/locking.js:226` compared `lockInfo.userId === userId` strictly while `releaseLock` used the `sameUser()` helper for the identical comparison. When the ids differ in type (a stored ObjectId against an incoming string) the rightful owner could not refresh their own lock, so it expired while they were still editing and a collaborator could take it. The in-memory fallback and the auto-expire timer had the same flaw; all three now use `sameUser()`.
- **`rateLimit` is now atomic**, via a Lua script. The old `INCR` then `EXPIRE` pair had a failure mode worse than the throughput race the audit described: a process killed between the two calls (routine in serverless) leaves a key with **no TTL at all**, after which the counter climbs forever and that caller is rate-limited permanently rather than for one window. The script sets expiry in the same round trip and re-arms any key found without a TTL, which also self-heals keys orphaned by the old code. Errors are now caught too; previously a Redis exception here propagated into middleware as a 500.
- **`error.message` leaks closed.** The audit listed 7 sites; there were actually **15 across 11 files**, including `step/[stepNumber]`, `export/pdf`, `locks`, `editors`, and `admin/goals`. Rather than blanket-stripping, the fix respects an existing convention: this codebase's own errors set a 4xx `status` and their messages are written for the user ("A 2027-2028 plan already exists"), while unexpected errors carry none. The new `clientSafeMessage(error, fallback)` in `userAccess.js` passes the former through and replaces the latter, so Mongoose validation, cast, and duplicate-key text no longer reaches clients but the intentional messages survive. `transfer-ownership/route.js:97` from the original list no longer contains such a leak.
- **`console.log('📄 Forms for collaboration:', forms)`** removed from `CollaborationDashboard.js`.
- **Unit tests for `userAccess.js`** — `src/lib/userAccess.test.js`, 10 tests covering `clientSafeMessage`, `schoolScopeFilter`, and `bulkTargetFilter`. Notably it asserts that `schoolScopeFilter` never degrades into `{}` for a malformed actor, since that would silently return every school's records. Suite total is now 105.

**The dead `MongoClient` block was not merely wasteful — it was blocking.** Writing the `userAccess` test exposed that importing `src/lib/mongodb.js` called `client.connect()` at module load, in every environment, for a `clientPromise` that nothing outside the file ever read. The open handle made the test suite hang indefinitely rather than exit. So this item was promoted out of the perf backlog and fixed here: the block and its export are gone, and importing the module no longer opens a connection. `mongodb` and `@next-auth/mongodb-adapter` remain in `package.json` and can go with the rest of the unused dependencies.

Deliberately left alone: `users/bulk-import/route.js:129` still returns `Database error: ${error.message}` per failed CSV row. That is not a 500 response but per-row feedback in a successful import, it is visible only to a level-4-or-above admin importing their own data, and an admin fixing a spreadsheet genuinely needs to know which row failed and why.

Still open (highest value first): burning down the 80 lint warnings and promoting the React Compiler rules to errors, which is largely the same job as splitting `form/[id]/page.js`; the lock-acquisition fail-open decision; the ~3,000 lines of dead `Step*.js` duplication and the five unused dependencies; and the code-splitting and accessibility work in sections 3 and 6.

---

## 2. Security & Data Protection

### 2.1 Authentication, authorization, and session management

#### What's working

`src/lib/auth.js` is the strongest file in the codebase security-wise:

```js
// src/lib/auth.js:13-24
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  authorization: {
    params: {
      hd: 'schools.nyc.gov',
      prompt: 'select_account',
      scope: 'openid email profile',
    },
  },
  checks: ['pkce', 'state', 'nonce'],
}),
```

The `hd` parameter is correctly treated as a hint rather than a control — `signIn` re-verifies the email suffix server-side and requires an active DB record (`src/lib/auth.js:27-49`). The app fails fast if `NEXTAUTH_SECRET` is missing (lines 7-9), and secure cookies are enabled based on the `NEXTAUTH_URL` scheme (line 133).

The edge gate in `src/proxy.js` enforces authentication on every `/api/*` path except `/api/auth` and `/api/public`, requires level >= 4 for `/api/admin/*`, and level >= 5 for a hardcoded list of super-admin endpoints.

#### Issue 2.1.1 — The super-admin API list is a hardcoded allowlist (Medium)

```js
// src/proxy.js:12-20
const SUPER_ADMIN_APIS = [
  '/api/admin/questions',
  '/api/admin/health',
  '/api/admin/goals',
  '/api/admin/forms/rollover',
  '/api/admin/forms/migrate-contacts',
  '/api/admin/forms/live',
  '/api/admin/forms/export',
];
```

Any new `/api/admin/*` route defaults to level 4. That default is reasonable, but the list will silently drift as routes are added — a new destructive super-admin route would be reachable by every principal in the district until someone remembers to edit this array. Move the requirement into the route handlers themselves, or derive it from a colocated config.

#### Issue 2.1.2 — Logout revocation fails open (Medium)

```js
// src/lib/redis.js:175-180
async function isTokenDenied(jti) {
  if (!jti) return false;
  const redis = await getRedis();
  if (!redis) return false;
  return (await redis.exists(denyKey(jti))) === 1;
}
```

When Redis is unreachable — and `getRedis()` deliberately backs off for 60 seconds after a connection failure (`src/lib/redis.js:18-32`) — every revoked token becomes valid again for up to the remaining 8-hour session lifetime. Rate limiting was correctly given a `failClosed` option; token revocation was not. Given that `.env.example` documents `REDIS_URL` as "Required in production," this should fail closed there too.

#### Issue 2.1.3 — Step-save rate limit fails open (Medium)

```js
// src/app/api/forms/[id]/step/[stepNumber]/route.js:123
const limited = await rateLimit(`rl:save:${userId}:${id}`, 30, 60);
```

Unlike `enforceRateLimit` in `src/lib/userAccess.js`, this call omits `{ failClosed: productionFailClosed() }`, so the 30-saves-per-minute cap disappears whenever Redis is down.

#### Issue 2.1.4 — Rate limit counter is non-atomic (Low)

```js
// src/lib/redis.js:153-154
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, windowSeconds);
```

`INCR` and `EXPIRE` are separate round trips. If the process dies between them, the key persists without a TTL and permanently locks out that key. Replace with a Lua script or `SET key 0 EX w NX` followed by `INCR`.

### 2.2 Authorization: object-level access control

This is the weakest area. The pattern is inconsistent: some routes do careful multi-factor checks, others do none.

#### 2.2.1 — CRITICAL: Mass assignment on `PUT /api/users/[id]/permissions`

```js
// src/app/api/users/[id]/permissions/route.js:7-42
async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.level < 4) { /* 401 */ }

    const { id } = params;
    const { permissions } = await request.json();
    // ...
    if (!permissions || typeof permissions !== 'object') { /* 400 */ }

    await connectDB();

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: permissions },
      { new: true, runValidators: true }
    );
```

Four separate problems compound here:

- **No field whitelist.** `permissions` is spread straight into `$set`, so `level`, `isActive`, `email`, and `schoolName` are all writable.
- **No target scoping.** There is no `canManageTarget` call and no school filter — unlike the properly-guarded `/api/users` PUT and `/api/users/create`, which both use the helpers in `src/lib/userAccess.js` and `src/lib/canManageUser.js`.
- **No self-protection.** Nothing prevents a level-4 admin from elevating themselves or a colleague to level 5.
- **Response leaks the full user document** including `activityLog` (line 54).

There is a mitigating accident: **this route is currently non-functional.** Line 18 uses `const { id } = params` synchronously. In Next.js 16 `params` is a Promise (every other dynamic route in the repo correctly uses `await params` — verified across 18 call sites), so `id` is `undefined` and the route always returns 400. This means:

- The admin UI's level dropdown at `src/app/admin/users/page.js:729` is **silently broken** for users today.
- The moment someone "fixes" the obvious `await` bug, a full privilege-escalation vulnerability goes live.

**Fix**: delete this route and point the UI at `/api/users` PUT, which already implements the correct guards. If it must stay, whitelist fields explicitly, call `canManageTarget`, reject `level >= actor.level`, and return only a projection of the updated user.

#### 2.2.2 — CRITICAL: Cross-school attestation

```js
// src/app/api/forms/[id]/attest/route.js:24-49
if (user.level < 4) {
  return NextResponse.json({ error: 'Only principals can attest to a school plan' }, { status: 403 });
}

const { id } = await params;
const form = await FormSubmission.findById(id);
if (!form) { /* 404 */ }
if (await isFormLocked(form)) { /* 403 */ }
// ... no school / ownership check ...
form.attestation = {
  confirmed: true, name, signedAt: new Date(), signedBy: user._id,
};
await form.save();
```

The only gate is "is this user level 4 or higher." Any principal in the district can attest to any other school's plan. Attestation is a **legal signature of compliance review** — this is the highest-consequence finding in the report even though it requires an authenticated principal account. Add the same `isOwner || isPrincipalByEmail || isSameSchool || isSuperAdmin` check used elsewhere.

#### 2.2.3 — HIGH: Any authenticated user can clear compliance flags

```js
// src/app/api/forms/[id]/review-flag/route.js:24-41
const { id } = await params;
const form = await FormSubmission.findById(id);
if (!form) { /* 404 */ }
if (await isFormLocked(form)) { /* 403 */ }

const body = await request.json().catch(() => ({}));
const questionId = String(body.questionId || '').trim();
// ... no permission check at all ...
form.needsUpdate = (form.needsUpdate || []).filter((item) => item.questionId !== questionId);
form.markModified('needsUpdate');
await form.save();
```

A level-1 viewer can erase "needs update" flags — the district's mechanism for tracking outstanding compliance issues — on any form in the system.

#### 2.2.4 — HIGH: District-wide PII export from a school-level account

```js
// src/app/api/admin/reports/route.js:19-44
const user = await User.findOne({ email: session.user.email });
if (!user || user.level !== 4) {
  return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
}

const { startDate, endDate, status } = await request.json();
const query = {};
// ... only date and status filters, no schoolName ...
const submissions = await FormSubmission.find(query)
  .populate('userId', 'name email level')
  .populate('reviewedBy', 'name email')
```

The resulting CSV includes school name, principal name, principal email, status, and review comments for every school. Two bugs in one: the strict `!== 4` also **locks out level-5 super admins**, which is almost certainly unintended and suggests this check was never revisited.

The same unscoped-read pattern appears in:

- `src/app/api/admin/timeline/route.js:47` — `FormSubmission.find({}).lean()` for level-4 callers
- `src/app/api/users/audit-logs/route.js:47-49` — all `AuditLog` entries and all users' `activityLog`
- `src/app/api/admin/forms/share/route.js:159-163` — GET accepts any `formId` and returns collaborator names/emails, while the POST handler on the same route *does* correctly scope level-4 to their own school (lines 46-48)

#### 2.2.5 — HIGH: Level-3 write access diverges between two routes

The step-save route grants same-school write to levels 2, 3, and 4:

```js
// src/app/api/forms/[id]/step/[stepNumber]/route.js:170-178
const isSameSchool =
  Boolean(user.schoolName && form.schoolName && user.schoolName === form.schoolName) &&
  (user.level === 2 || user.level === 3 || user.level === 4);
const hasEditAccess = form.editAccess?.some((ea) => ea.userId?.toString() === userId);
const isAssignedLevel3 = user.level === 3 && form.assignedTo?.some((at) => at.userId?.toString() === userId);
// ...
if (!isOwner && !isPrincipalByEmail && !isSuperAdmin && !isSameSchool && !hasEditAccess && !isAssignedLevel3 && !hasSharedEditAccess) {
```

The main form route deliberately excludes level 3 from the same-school grant:

```js
// src/app/api/forms/[id]/route.js:363-365
const isSameSchool = (isPrincipal || isLevel2) && user.schoolName && form.schoolName &&
                     user.schoolName === form.schoolName;
```

Note that `isAssignedLevel3` on line 174 of the step route is dead code — `isSameSchool` already covers every level-3 user it would match. The assignment mechanism for Assistant Principals is effectively bypassed. Pick one policy and extract it into a shared `canEditForm(user, form)` helper in `src/lib/`.

#### 2.2.6 — HIGH: Hardcoded personal email backdoor

```js
// src/app/api/forms/[id]/share/route.js:25-28
const isAuthorizedEmail = user.email.toLowerCase() === 'jjaramillo7@gmail.com';
if (user.level !== 5 && !isAuthorizedEmail) {
  return NextResponse.json({ error: 'Only Super Admins can share forms by email' }, { status: 403 });
}
```

A personal Gmail address is hardcoded as a share administrator. This address cannot even authenticate (the `signIn` callback requires `@schools.nyc.gov`), so it is dead code — but it is a credential-shaped artifact sitting in a public-facing authorization check and must be removed.

Separately, the share model has no expiry: `sharedWithEmails` entries on `FormSubmission` (model lines 270-290) grant access indefinitely, and the share endpoint does not restrict the invited address to the `@schools.nyc.gov` domain.

#### 2.2.7 — MEDIUM: Remaining gaps

- `src/app/api/forms/[id]/editors/register/route.js:22-37` registers an active editor without ever loading the form or checking access — lets any user pollute presence indicators and lock UX on arbitrary forms.
- `src/app/api/admin/users/school/route.js:89-96` blocks level-4 from creating level-4/5 users but places no cap on level-5, so a super admin can mint another super admin here. `/api/users/create` correctly rejects `nextLevel >= actor.level`; these two paths should be unified.
- `src/app/api/notifications/route.js:81-92` POST accepts any `submissionId` without verification. Harmless today (no side effect) but a trap for the next person to extend it.

### 2.3 Input validation and injection risk

**Good**: `src/lib/questionBankUtils.js` provides `sanitizeQuestionUpdates` and `sanitizeStepUpdates`, both unit-tested, and the admin question routes consistently use them. Table/contact parsing is centralized in `contactTextParser.js` with 21 tests.

**Gaps**:

- The `$set: permissions` case in 2.2.1 is the one true mass-assignment hole.
- The installed Mongoose has an advisory for **improper `$nor` sanitization in `sanitizeFilter`** plus **prototype pollution via `__proto__`-prefixed dotted paths in update casting**. The codebase does not appear to pass raw user objects into filters elsewhere, but the `$set` route above is exactly the shape that advisory targets.
- Most routes cast IDs via `findById` without validating `ObjectId` format first, so malformed IDs surface as caught 500s rather than 400s. Cosmetic, but it inflates error noise.

### 2.4 Secret handling

**This is handled correctly.** Verified:

- `git ls-files | grep -iE "env|secret|key"` returns only `docs/deploy/environment.mdx` — **no env file is tracked**.
- `.gitignore` covers `.env*`, `.env`, `.env.local`, `.env*.local`, plus `migration_diff*.json` with an explicit "school PII" comment. Someone thought about this.
- `.vercelignore` independently excludes `.env` and `.env.*` while allowing `.env.example`.
- `.env.example` contains only placeholders.

Two minor notes:

- **Duplicate local env files.** `.env` and `.env.local` both exist with overlapping keys (`MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `REDIS_URL`). Next.js loads `.env.local` with higher precedence, so the values in `.env` are shadowed and will silently drift. Consolidate to one.
- `.env.local` contains a `VERCEL_OIDC_TOKEN` from `vercel env pull`. Expected, but worth knowing it's there.

### 2.5 Dependency vulnerabilities

`npm audit` reports **18 advisories: 2 critical, 12 high, 4 moderate.**

| Package | Severity | Why it matters here |
|---|---|---|
| `next` 16.2.7 | High | Advisory list includes **middleware/proxy bypass in App Router**, cache confusion on request bodies, and unauthenticated disclosure of internal Server Function endpoints. The proxy bypass is the critical one — `src/proxy.js` is the primary authorization gate. |
| `next-auth` | Critical | OAuth **state/nonce/PKCE cookies not bound to the issuing provider**; `getToken()` throws uncaught on malformed Bearer headers; homoglyph `@` bypass in email normalization. All three touch the login path directly. |
| `jspdf` 3.x | Critical | Path traversal, PDF injection enabling arbitrary JS in generated PDFs, DoS via malformed BMP/GIF. Fix requires a **major bump to 4.2.1**. Used only in `src/components/FormViewer.js:14`. |
| `mongoose` | High | `sanitizeFilter` `$nor` NoSQL injection; prototype pollution in update casting. |
| `sharp` / `libvips` | High | Transitive via `@once-ui-system/core` and `next`. |
| `dompurify` | Moderate | ~19 XSS bypass advisories. Transitive (jspdf). |
| `postcss`, `minimatch`, `picomatch`, `brace-expansion`, `nanoid`, `immutable`, `ip-address`, `preact`, `uuid`, `yaml`, `socks` | Mixed | Mostly transitive ReDoS/DoS. |

Everything except `jspdf` is fixable in-range with `npm audit fix`. Prioritize `next` and `next-auth`.

---

## 3. Frontend Architecture & UX

### 3.1 Component structure and reusability

Twenty largest files:

| Lines | File |
|---:|---|
| 2,082 | `src/app/form/[id]/page.js` |
| 1,220 | `src/app/admin/questions/page.js` |
| 1,128 | `src/app/admin/users/page.js` |
| 899 | `src/app/admin/submissions/page.js` |
| 731 | `src/app/admin/goals/page.js` |
| 647 | `src/app/api/forms/[id]/route.js` |
| 629 | `src/components/CollaborationDashboard.js` |
| 625 | `src/app/api/admin/goals/route.js` |
| 537 | `src/components/FormViewer.js` |
| 513 | `src/app/dashboard/page.js` |
| 492 | `src/app/admin/logs/page.js` |
| 468 | `src/components/BulkOperations.js` |
| 435 | `src/components/SmartFilters.js` |
| 434 | `src/app/admin/system/page.js` |
| 430 | `src/components/UserAnalytics.js` |
| 427 | `src/app/api/forms/[id]/export/pdf/route.js` |
| 426 | `src/components/admin/SubmissionsWorkspace.js` |
| 417 | `src/components/UserRoleTemplates.js` |
| 415 | `src/app/view/[id]/page.js` |
| 399 | `src/components/AnalyticsDashboard.js` |

#### 3.1.1 — The form page is a god component (High)

`src/app/form/[id]/page.js` is 2,083 lines with **41 `useState` declarations and 12 `useEffect` hooks**. It owns form fetching, autosave, step navigation, distributed lock acquisition, active-editor heartbeats, share/comment/attest/submit modals, PDF triggers, and all rendering.

The codebase already demonstrates the right pattern elsewhere — `FormWorkspace.js` (278 lines, 2 `useState`) and `SubmissionsWorkspace.js` (427 lines, 2 `useState`) are clean presentational shells. The refactor target is to extract `useFormData`, `useAutoSave`, and `useCollaboration` hooks and reduce the page to a coordinator under ~300 lines.

#### 3.1.2 — ~3,000 lines of dead duplicated step components (High)

`Step2PrincipalLetter.js` through `Step15SchoolCounselingPlan.js` total **3,072 lines across 14 files and are never imported anywhere.** The live rendering path uses `Step1TableOfContents` for step 1 and `GenericFormStep` + `QuestionCard` for everything else.

These are not thin wrappers — each is a 200-256 line copy-paste with duplicated `useState`/`useEffect`/`handleInputChange`/`renderQuestion` boilerplate and inline Tailwind markup. Pairwise similarity against `Step10PlanningInterviews.js` runs 76-91% for Steps 5, 6, 7, and 14.

Delete them. They are pure maintenance drag and they actively mislead anyone trying to understand how a step renders.

### 3.2 State management and data fetching

There is **no state management library and no data-fetching library** — no SWR, no React Query, no React Context anywhere in `src/`. Everything is `useState` + `useEffect` + raw `fetch`.

**All 14 `page.js` files are `'use client'`** (86 of 143 files overall, 60%). The root layout is a server component, but no route does server-side data fetching, so React Server Components provide essentially no benefit today. Every page ships as a client bundle entry and every page waits for a client-side round trip before showing data.

#### Fetch races

`src/hooks/useQuestionBank.js:19-63` is the model to copy — it uses a `cancelled` flag and cleans up correctly. Most other call sites don't:

| File | Lines | Issue |
|---|---|---|
| `src/app/form/[id]/compare/page.js` | 25-35 | No abort; races if `formId` changes |
| `src/app/view/[id]/page.js` | 57-68 | `loadFormData()` with no `AbortController` |
| `src/app/dashboard/page.js` | 72-82 | Parallel fetches, no abort, `fetchForms` missing from deps |
| `src/components/public/PublicShell.js` | 21-28 | Fire-and-forget, no loading or error UI |
| `src/components/dashboard/DeadlineReminders.js` | 11-16 | Same |

#### A data waterfall on the critical path

```js
// src/app/form/[id]/page.js:45-50
const { questionBank, loading: questionBankLoading } = useQuestionBank({
  schoolYear: formData.schoolYear,
```

`schoolYear` is empty until `loadFormData()` resolves, so the sequence is session → form fetch → question bank fetch, serialized. This is the slowest path in the app and it's the one users hit most.

#### Timers

Most intervals clean up properly (editor heartbeat at lines 302-307, autosave backup at 928-947). One does not:

- `src/app/form/[id]/page.js:1259-1267` — a redirect countdown `setInterval` stored in a local variable, never cleared on unmount.

There's also a leftover no-op effect that should be deleted:

```js
// src/app/form/[id]/page.js:921-924
useEffect(() => {
  // Don't auto-save during step navigation - it's causing state issues
  // Auto-save will happen through the navigation functions instead
}, [currentStep, stepData]);
```

### 3.3 Performance

#### 3.3.1 — Zero code splitting (High)

**There is no `next/dynamic` usage anywhere in `src/`.** Heavy libraries are statically imported into client components:

| Library | File:line | Impact |
|---|---|---|
| `ag-grid-react` + CSS | `src/app/admin/goals/page.js:11-14` | Large grid bundled unconditionally |
| `recharts` | `src/app/admin/goals/page.js:15-32` | Charting library |
| `recharts` | `src/components/AnalyticsDashboard.js:20` | Pulled into the dashboard bundle |
| `recharts` | `src/components/UserAnalytics.js:19` | Pulled into the admin users bundle |
| `jspdf` | `src/components/FormViewer.js:14` | Loads even when the print modal is closed |
| `html2canvas` | `src/components/FormViewer.js:15` | Same |

The dashboard is the worst case — `src/app/dashboard/page.js:7-17` statically imports `AnalyticsDashboard`, `SmartNotifications`, `BulkOperations`, `SchoolPerformanceScoring`, and `BulkFormCreation`, then conditionally renders them on `activeView`. The conditional render saves nothing at the bundle level.

#### 3.3.2 — Wasted MongoDB connection pool per instance (High)

```js
// src/lib/mongodb.js:10-23
// MongoDB client for NextAuth
let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}
```

`clientPromise` is exported at line 93 but **never imported anywhere** — the app uses the JWT session strategy, so `@next-auth/mongodb-adapter` was never wired up. Every serverless instance therefore opens a second, entirely unused MongoClient connection pool at module load, alongside the Mongoose pool configured with `maxPoolSize: 50`. On a Fluid Compute deployment with many instances this is a direct contributor to Atlas connection-limit pressure. Delete the `MongoClient` block and the `@next-auth/mongodb-adapter` dependency.

Also reconsider `maxPoolSize: 50` (line 56). In a serverless environment that ceiling is per-instance, not global.

#### 3.3.3 — Broad collection scans

Six routes issue unfiltered `find({})` against `FormSubmission`:

- `src/app/api/admin/timeline/route.js:47`
- `src/app/api/admin/goals/route.js:490`
- `src/app/api/admin/forms/export/route.js:36` — sorts in Mongo, then filters **in JS**
- `src/app/api/admin/forms/rollover/route.js:37` — no `.lean()`, so full Mongoose hydration
- `src/app/api/public/overview/route.js:27` — unauthenticated, though 60s Redis-cached after first hit
- `src/app/api/school-year/route.js:30` — `FormTemplate.find({})`

`.lean()` appears in only 9 of 47 route files and `.select()` in 7. Given that `FormSubmission` documents embed all 15 steps of form data, hydrating full documents to compute counts is expensive. Indexes are reasonable (`src/models/FormSubmission.js:376-387`, including a partial unique index on `schoolName + schoolYear`), so the fix is projection and aggregation rather than new indexes.

#### 3.3.4 — Rendering

- **No memoization in the god pages.** `useMemo`/`useCallback`/`React.memo` appear in ~16 files total; `form/[id]/page.js`, `admin/questions/page.js`, and `admin/users/page.js` have none.
- **Inline async prop recreated every render**, forcing all `QuestionCard` children to re-render:

```js
// src/app/form/[id]/page.js:1222-1232
onReviewQuestion={async (questionId) => {
  const response = await fetch(`/api/forms/${formId}/review-flag`, {
```

- **No list virtualization** for submissions, users, or compare views.
- **`key={index}`** at `src/app/admin/users/page.js:912,1001,1062`; `src/app/admin/goals/page.js:600,633,666,699`; `src/components/UserAnalytics.js:379`; `src/components/UserRoleTemplates.js:300`; `src/components/PrincipalEmailAutocomplete.js:171`.

#### 3.3.5 — Assets

Genuinely good here: `next/image` is used in `AppFooter.js`, `PublicShell.js`, and `login/page.js`, and there are **zero raw `<img>` tags** in `src/`.

Missing: no `experimental.optimizePackageImports` for `recharts`/`lucide-react`, and no bundle analyzer.

### 3.4 Accessibility

#### 3.4.1 — Modals lack dialog semantics entirely (High for a11y)

Over 20 usages of `.app-modal-backdrop`, and **none** of `FormConfirmModal`, `FormAttestModal`, `FormShareModal`, `FormCommentModal`, `DuplicateFormModal`, or the inline admin modals implement:

- `role="dialog"` / `aria-modal="true"`
- `aria-labelledby` / `aria-describedby`
- Focus trap on open, or focus return to the trigger on close
- Escape-to-close
- Backdrop click-to-dismiss

For a system used across a public school district, this is likely a **WCAG 2.1 AA compliance gap with legal exposure**. Build one shared `Modal` primitive and migrate all call sites.

#### 3.4.2 — Label association

The active `QuestionCard` path is partially good — yes/no groups correctly use `role="radiogroup" aria-label={question.title}` (`QuestionCard.js:81`) and `TableAnswerField.js:47,62` sets `aria-label` on cell inputs. But text and textarea inputs set `id={question.id}` while rendering the prompt as a `<Text>` element, so there is no programmatic association (`QuestionCard.js:124-155`). The same pattern repeats in every modal:

```jsx
// src/components/form-steps/FormAttestModal.js:14-21
<Column gap="8">
  <Text variant="label-default-s">Your name</Text>
  <input
    className="app-field"
    value={name}
```

#### 3.4.3 — Keyboard-inaccessible interactive card

`src/components/dashboard/StatCard.js:19-28` renders a `Card` with `onClick` and `cursor: pointer` but no `role="button"`, `tabIndex`, or key handler. (Credit where due: navigation elsewhere correctly uses `Row as="button"` in `FormWorkspace.js:209-220` and `Step1TableOfContents.js:121-132`, and there are no `<div onClick>` handlers anywhere.)

### 3.5 UI error handling

**There is no `error.js`, `global-error.js`, `not-found.js`, or `loading.js` file anywhere under `src/app`.**

Every route segment is affected: `/`, `/login`, `/dashboard`, `/form/[id]`, `/form/[id]/compare`, `/view/[id]`, `/admin/*`, `/about`. Any unhandled render error produces the default Next.js error screen, and every page hand-rolls its own inline spinner instead of using Suspense boundaries.

`src/app/layout.js` is otherwise solid — `lang="en"` (line 59), full metadata with OpenGraph and Twitter cards (lines 11-55), and private segments correctly re-export `robots: { index: false }`. The one gap is a missing `export const viewport`.

---

## 4. Backend & Architecture

### 4.1 API design

**Strengths**: Consistent App Router `route.js` layout; sensible resource nesting (`/api/forms/[id]/step/[stepNumber]`); real optimistic-concurrency support on step saves via `lastUpdated` / `revisionCount` / `mergeStrategy` (`step/[stepNumber]/route.js:135-142`); genuine distributed locking with HTTP 423 responses.

**Weaknesses**:

- **Mixed module systems.** Some routes use ESM `import`, others CommonJS `require`, and several mix both in one file (`attest/route.js` uses `import` at lines 1-2 and `require` at 4-10). This blocks any future move to Turbopack builds and makes tree-shaking unpredictable.
- **Three overlapping user-creation paths** with three different guard levels: `/api/users/create` (correct), `/api/admin/users/school` POST (weaker), `/api/users/[id]/permissions` (none).
- **No shared authorization helper for forms.** The `isOwner || isPrincipalByEmail || isSameSchool || ...` expression is re-implemented inline in at least four routes with subtly different terms. This is the root cause of findings 2.2.2, 2.2.3, and 2.2.5.

### 4.2 Caching

Redis caching is well-designed where it exists: namespaced keys (`qb:published:*`, `year:*`, `public:overview:*`), targeted invalidation helpers, `SCAN`-based pattern deletion rather than `KEYS`, and a genuinely nice health endpoint exposing keyspace breakdown (`src/lib/redis.js:233-325`). The 60-second backoff on connection failure (lines 18-32) is a good resilience touch.

Gaps: no HTTP-layer caching (no `revalidate`, `unstable_cache`, or `Cache-Control` on any route), and the expensive district-wide admin aggregations in `timeline` and `goals` are uncached.

### 4.3 Distributed locking

`src/lib/locking.js` is mostly correct — `SET ... EX ttl NX` for acquisition (line 54) and ownership verification before `DEL` on release (lines 187-189). Three issues:

1. **Acquire fails open** (lines 159-166) — on Redis error it returns `success: true`, permitting concurrent edits during an outage.
2. **`refreshLock` uses strict equality** `lockInfo.userId === userId` (line 226) while release uses a `sameUser()` helper that handles ObjectId/string coercion. A type mismatch means refresh silently fails and the lock expires mid-edit.
3. **In-memory fallback is per-instance** — on Vercel, locks provide no protection at all without Redis. Documented, but worth surfacing in the admin health UI.

### 4.4 Error handling and logging

**311 console statements** across `src/` (112 `log`, 185 `error`, 14 `warn`). Highest concentrations: `src/scripts/fix-form-permissions.js` (50), `src/app/form/[id]/page.js` (34), `src/app/api/forms/[id]/route.js` (14).

#### PII in logs and responses

```js
// src/app/api/forms/[id]/route.js:380-411
return NextResponse.json({
  error: 'Access denied',
  details: {
    isOwner, isPrincipalByEmail, /* ... */
    userEmail: user.email,
    principalEmail: form.principalEmail,
    formOwnerId: formUserId || 'unknown',
    userId: user._id?.toString() || 'unknown'
  }
}, { status: 403 });
```

This both logs and **returns to the client** the requesting user's email, the form's principal email, both school names, and internal ObjectIds. It's a debugging aid that shipped. Strip it.

`src/components/CollaborationDashboard.js:86` logs the entire forms array (school names, principal emails) to the browser console unconditionally.

Raw `error.message` reaches clients on 500 responses in: `forms/[id]/share/route.js:111,196,245`; `forms/[id]/comments/route.js:105`; `users/audit-logs/route.js:105`; `admin/goals/route.js:620`; `school-year/route.js:84,136`; `transfer-ownership/route.js:97`.

#### Sentry is barely wired up

```js
// src/lib/reportError.js:1-21
function reportError(error, context = {}) {
  console.error(error);
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const Sentry = require('@sentry/node');
  if (!global.__d79Sentry) { Sentry.init({ dsn, ... }); }
  Sentry.captureException(...);
}
```

`reportError` is called from only **8 of 47 routes**. There is no `instrumentation.js`, no `sentry.client.config.js`, no `sentry.server.config.js`, and no client-side error capture at all. Correctly, `@sentry/node` never reaches the browser or edge bundle. The lazy no-op-without-DSN design is fine; the coverage is not.

### 4.5 Edge-case resilience

Good: `connectDB` retry with backoff (`mongodb.js:77-86`), Redis in-memory fallbacks throughout, `isFormLocked` archived-year checks on every mutating form route, PDF generation timeout (`export/pdf/route.js:215`).

Gaps: **no rate limiting on any export route** (`forms/[id]/export/pdf`, `forms/[id]/export/docx`, `admin/forms/export`) despite PDFKit/docx generation being the most CPU-expensive operation in the app — an authenticated user can trigger it in a loop.

---

## 5. Code Quality & Maintainability

### 5.1 Linting — there isn't any

Verified by running it:

```
$ npm run lint
> next lint
Invalid project directory provided, no such directory: .../d79-directory-app/lint
exit code: 1
```

Two compounding problems:

1. **No ESLint is installed.** No `.eslintrc*`, no `eslint.config.*`, and no `eslint` entry in `package.json` or as a direct dependency in `package-lock.json`.
2. **`next lint` was removed in Next.js 16.** Next 16.2.7 interprets `lint` as a directory argument. `next --help` lists no `lint` subcommand.

So the repository has had **zero automated linting** for its entire Next 16 lifetime, which explains findings like the sync-`params` bug in 2.2.1 (`react-hooks` and `@next/next` rules would have caught several of these). Migrate to a flat `eslint.config.mjs` with `eslint-config-next`.

### 5.2 Type safety — effectively none

Both `tsconfig.json` and `jsconfig.json` exist. Next.js honors `tsconfig.json`, so `jsconfig.json` (which only sets `baseUrl` and `paths`) is dead config that will confuse editors.

```jsonc
// tsconfig.json:1-12
"allowJs": true,
"skipLibCheck": true,
"strict": false,
```

With `strict: false` and **no `checkJs`**, JS files are included in the program but never type-checked. `next.config.js:9-11` sets `typescript.ignoreBuildErrors: false`, which sounds reassuring but checks essentially nothing.

There are exactly 3 TypeScript files — `src/types/index.ts`, `src/types/next-auth.d.ts`, `src/lib/contactTextParser.d.ts` — and **nothing imports from them** (grep for `@/types` / `types/` returns 0 matches in `src/`). They're documentation cosplaying as types.

Recommended path: enable `checkJs` with `strict: false` first, fix the resulting errors incrementally with JSDoc, then migrate `src/lib/` and `src/models/` to `.ts` where the payoff is highest.

### 5.3 Testing

50 tests pass across 6 files, all pure-function unit tests:

| Test file | Tests | Covers |
|---|---:|---|
| `contactTextParser.test.js` | 21 | Name/title/email/phone parsing, bullets, table rendering, custom columns |
| `questionBankUtils.test.js` | 8 | Yes/no normalization, gated visibility, `sanitizeQuestionUpdates`, `sanitizeStepUpdates` |
| `linkifyText.test.js` | 7 | URL linkification, `javascript:` blocking, markdown links |
| `tableAnswer.test.js` | 7 | Column syntax, pipe dropdowns, semicolon escaping, `normalizeColumnDefs` |
| `questionCopy.test.js` | 4 | Heading/body split, long titles |
| `formattedCopy.test.js` | 3 | Paragraph and list block splitting |

The tests that exist are good — they target exactly the tricky parsing logic that benefits most. The problem is everything around them:

- **6 of 29 lib modules tested (21%).** Untested: `auth.js`, `canManageUser.js`, `userAccess.js`, `locking.js`, `redis.js`, `activeEditors.js`, `formProgress.js`, `stepSave.js`, `schoolYearSettings.js`, `auditLogger.js`, `formDuplicate.js`, `exportTables.js`, and 11 more.
- **0 of 47 API routes tested.** Every finding in section 2.2 would have been caught by a basic authorization test suite.
- **0 of 73 components tested.**
- **No E2E framework** (no Playwright, Cypress, Jest, or Vitest configured).
- **No CI.** No `.github/workflows/` directory exists.
- **No pre-commit hooks.** No husky, no lint-staged.

The highest-value first test suite is an authorization matrix over form routes: for each of the 5 user levels crossed with owner / same-school / other-school, assert the expected status code. That's roughly 100 assertions and it would lock down the entire section 2.2 class of bugs.

### 5.4 Dead code and unused dependencies

**Unused runtime dependencies** (0 references in `src/`):

| Package | Note |
|---|---|
| `bcryptjs` | No password field exists on the `User` model — auth is Google-only |
| `jsonwebtoken` | NextAuth handles all JWT work |
| `@next-auth/mongodb-adapter` | Never configured; see the wasted connection pool in 3.3.2 |
| `classnames` | Unreferenced |
| `react-icons` | Unreferenced — `lucide-react` (40 files) is the actual icon library |

`bcryptjs` and `jsonwebtoken` in particular are worth removing: their presence implies a credentials-based auth path that doesn't exist, which is misleading during a security review.

**Dead source files**: Steps 2-15 (~3,072 lines, section 3.1.2). Notably, the components that *look* orphaned — `AnalyticsDashboard`, `SmartFilters`, `UserAnalytics`, `BulkOperations`, `CollaborationDashboard`, etc. — are all genuinely imported and used.

**Two zero-byte files tracked in git** at the repo root: `next` and `d79-directory@0.1.0`. Both are 0 bytes and both appear in `git ls-files` — almost certainly accidental shell-redirect artifacts (`npm run … > next`).

**No TODO/FIXME/HACK/XXX comments** anywhere in `src/`.

### 5.5 Duplicated logic

Answer formatting is implemented three times:

- `src/lib/schoolYearSettings.js:333-345` — the canonical `formatAnswer()`
- `src/app/api/forms/[id]/export/pdf/route.js:277-290` — inline duplicate
- `src/app/api/forms/[id]/export/docx/route.js:229-241` — inline duplicate

These will drift, and when they do, the PDF and DOCX exports of the same plan will disagree. Since exports are the compliance artifact of record, that's a correctness risk, not just a tidiness one.

### 5.6 Build configuration

`"build": "next build --webpack"` opts out of Turbopack. The reason is documented honestly in `next.config.js:12-14` (pdfkit/fontkit ESM builds import `applyDecoratedDescriptor` from `@swc/helpers`, which Next 16 doesn't export). That's a legitimate workaround, but it means slower builds and a growing divergence from the framework default. Worth revisiting periodically, or replacing `pdfkit` with a Turbopack-compatible generator.

The CSP allows `'unsafe-inline'` and `'unsafe-eval'` in `script-src` (`next.config.js:61`), which substantially weakens it. This is acknowledged in `docs/architecture/security.mdx:78`. Next.js supports nonce-based CSP via middleware — worth pursuing since `src/proxy.js` already intercepts every request.

### 5.7 Documentation

`docs/` is a 33-file Mintlify site covering architecture, API reference, deployment, and features. It's genuinely current — it references the Next 16 proxy, the webpack build workaround, `SENTRY_DSN`, and Redis. Two issues: placeholder images (`https://placehold.co/600x400`) throughout, and both `mint.json` and `docs.json` present (the dual-config problem is flagged in `docs/README.md:14-15`).

---

## 6. Actionable Roadmap

### High priority

**Security — authorization**

- [x] Delete `src/app/api/users/[id]/permissions/route.js` and route the admin UI at `src/app/admin/users/page.js:729` to `PUT /api/users`, which already enforces `canManageTarget` and level caps. If the route must survive, whitelist fields explicitly, add `canManageTarget`, reject `level >= actor.level`, fix `params` → `await params` at line 18, and return a projection instead of the full document.
- [x] Add a school/ownership check to `src/app/api/forms/[id]/attest/route.js` after line 32 — attestation is a legal signature and is currently cross-school.
- [x] Add a permission check to `src/app/api/forms/[id]/review-flag/route.js` before line 39 (currently any level-1 viewer can clear any form's compliance flags).
- [x] Scope `src/app/api/admin/reports/route.js:41` to `user.schoolName` for level 4, and fix `user.level !== 4` at line 20 to `user.level < 4` so super admins aren't locked out.
- [x] Scope `src/app/api/admin/timeline/route.js:47` and `src/app/api/users/audit-logs/route.js:47` to the actor's school for level-4 callers.
- [x] Add the school check to the GET branch (DELETE already had one) of `src/app/api/admin/forms/share/route.js:159`, mirroring what POST already does at lines 46-48.
- [x] Extract a single `canEditForm(user, form)` / `canViewForm(user, form)` helper into `src/lib/formAccess.js` and use it in `forms/[id]/route.js`, `step/[stepNumber]/route.js`, `attest`, `review-flag`, `editors`, `editors/register`, `locks`, and `comments/[commentId]`. Level-3 policy divergence resolved in favor of same-school edit.
- [x] Extend `formAccess` adoption to the remaining form routes: `compare` and `duplicate` (`export/pdf` and `export/docx` now use it).
- [x] Remove the hardcoded `jjaramillo7@gmail.com` bypass at `src/app/api/forms/[id]/share/route.js:25`.
- [x] Add a form-access check to `src/app/api/forms/[id]/editors/register/route.js:22` before calling `registerActiveEditor`.
- [x] Cap level-5 creation in `src/app/api/admin/users/school/route.js:89`, or consolidate it into `/api/users/create`.

**Security — dependencies**

- [x] Run `npm audit fix` to clear 17 of 18 advisories, prioritizing `next` (middleware/proxy bypass — this undermines `src/proxy.js`) and `next-auth` (OAuth state/nonce/PKCE cookies not bound to provider).
- [x] Plan the `jspdf` 3.x → 4.2.1 major upgrade (done; `npm audit` now reports 0 vulnerabilities); the only consumer is `src/components/FormViewer.js:14`.

**Security — information disclosure**

- [x] Remove the `details` object from the 403 response at `src/app/api/forms/[id]/route.js:397-411` (leaks emails and internal IDs to the client).
- [x] Strip `error.message` from production 500 responses. Turned out to be 15 sites across 11 files, not 7; solved with `clientSafeMessage()` so deliberate 4xx messages survive. `transfer-ownership/route.js:97` had no such leak.
- [x] Remove `console.log('📄 Forms for collaboration:', forms)` at `src/components/CollaborationDashboard.js:86`.

**Tooling**

- [x] Install ESLint with `eslint-config-next` and add a flat `eslint.config.mjs`; replace the broken `"lint": "next lint"` script. The `react-hooks` and `@next/next` rulesets would have caught several bugs in this report.
- [x] Add `.github/workflows/ci.yml` running `npm test`, `npm run lint`, and `npm run build` on pull requests.

**Correctness / performance**

- [x] Delete the unused `MongoClient` block at `src/lib/mongodb.js:10-23` and line 93. It was calling `client.connect()` at import time and hanging the test suite. The `mongodb` and `@next-auth/mongodb-adapter` dependencies still need removing.
- [x] Make `isTokenDenied` fail closed in production (`src/lib/redis.js:175-180`) so logout revocation survives a Redis outage. Deployments with no `REDIS_URL` are deliberately exempt.
- [x] Add `{ failClosed: productionFailClosed() }` to the step-save rate limit at `src/app/api/forms/[id]/step/[stepNumber]/route.js:123`.
- [x] Add rate limiting to `forms/[id]/export/pdf`, `forms/[id]/export/docx`, and `admin/forms/export`.

### Medium priority

**Frontend**

- [x] Delete `Step2PrincipalLetter.js` through `Step15SchoolCounselingPlan.js` (~3,072 lines of unreferenced duplication) from `src/components/form-steps/`. Also removed `QuestionStructureTemplate.js`, an orphan this report missed.
- [ ] Split `src/app/form/[id]/page.js` (2,083 lines, 41 `useState`) into `useFormData`, `useAutoSave`, and `useCollaboration` hooks plus a coordinator under ~300 lines.
- [x] Add `next/dynamic` wrappers for `ag-grid-react` and `recharts` in `src/app/admin/goals/page.js:11-32`, `recharts` in `AnalyticsDashboard.js:20` and `UserAnalytics.js:19`, and `FormViewer` (jspdf + html2canvas) where it's imported at `src/app/admin/submissions/page.js:8`. Measured 26-54% off initial JS per route; see the tenth pass.
- [x] Convert the eager widget imports at `src/app/dashboard/page.js:7-17` to dynamic imports so the conditional `activeView` render actually splits. Ten widgets, 1,801 KB to 1,261 KB.
- [x] Add `error.js` and `loading.js` to `src/app/form/[id]/`, `src/app/dashboard/`, and `src/app/admin/`; add `global-error.js` and `not-found.js` at `src/app/`. Eight files, backed by two shared primitives; see the ninth pass.
- [x] Build a shared `Modal` primitive with `role="dialog"`, `aria-modal`, focus trap, Escape handling, and focus restoration; migrate all 20+ `.app-modal-backdrop` call sites. All 25 migrated across 15 files, including the two drawer variants.
- [x] Associate labels with inputs in `QuestionCard.js:124-155` and in `FormAttestModal.js:14-21`, `FormShareModal.js`, `FormCommentModal.js`, `DuplicateFormModal.js`. Also the report and notice dialogs, and `PrincipalEmailAutocomplete` gained combobox semantics.
- [x] Add `role="button"`, `tabIndex={0}`, and a key handler to the clickable card in `src/components/dashboard/StatCard.js:19-28`.
- [x] Add `AbortController` cleanup to fetches in `form/[id]/compare/page.js:25`, `view/[id]/page.js:57`, `dashboard/page.js:72`, `PublicShell.js:21`, `DeadlineReminders.js:11` — followed the `cancelled`-flag pattern from `src/hooks/useQuestionBank.js:19-63` (7 fetches; `dashboard` had three in one effect).
- [x] Clear the redirect countdown interval on unmount at `src/app/form/[id]/page.js:1259-1267`, and delete the no-op effect at lines 921-924. The surrounding cleanup effect had two further bugs; see the seventh pass.

**Backend**

- [x] Extract the duplicated `formatAnswer` logic from `export/pdf/route.js:277-290` and `export/docx/route.js:229-241` — ~~into the canonical `schoolYearSettings.formatAnswer()`~~, which was the wrong target. Landed as `resolveExportAnswer` in the `exportTables.js` both routes already shared, with 9 tests. See the ninth pass.
- [x] Replace `find({})` + JS filtering with aggregation pipelines in `admin/timeline/route.js:47` (now school-scoped with a projection, but still counts in JS), `admin/goals/route.js:490`, `admin/forms/export/route.js:36`, and `admin/forms/rollover/route.js:37` (the last is missing `.lean()` entirely). Three became a shared `schoolYearQuery()`; timeline became a single `$group`. Verified against the production collection — see the eleventh pass.
- [x] Make `rateLimit` atomic via a Lua script at `src/lib/redis.js:153-154`. The real risk was an interrupted `INCR`/`EXPIRE` leaving a TTL-less key and locking a caller out permanently; the script also re-arms such keys.
- [x] Fix `refreshLock`'s strict comparison at `src/lib/locking.js:226` to use the same `sameUser()` helper as release (line 187). The in-memory fallback and auto-expire timer had it too.
- [x] ~~Make lock acquisition fail closed~~ — resolved by surfacing degraded mode instead; failing closed was the wrong call, see the fifth pass below.
- [x] Expand `reportError` coverage beyond the current 8 of 47 routes — now 45 of 46, the holdout being the NextAuth catch-all, which has no error handling of its own. Applied as a mechanical, semantics-preserving swap; see the eleventh pass.
- [x] Add client-side error reporting. Built as the zero-dependency option: `window` handlers posting to a rate-limited `/api/client-errors` that funnels into the same `reportError` the server uses, so provisioning `SENTRY_DSN` later starts capturing browser errors with no further changes. Verified in a real browser, including the two guards that stop a render loop becoming a request flood. See the thirteenth pass.

**Testing**

- [x] Write an authorization matrix test suite over the form routes: 5 user levels × {owner, same-school, other-school}. Implemented as `src/lib/formAccessMatrix.test.js` against the shared helper rather than HTTP status codes.
- [x] Add unit tests for `canManageUser.js`, `formProgress.js`, and `locking.js`. (`userAccess.js` done: `src/lib/userAccess.test.js`.) 56 tests added across five files; two of them found things. See the eleventh pass.

**Type safety**

- [x] Delete `jsconfig.json` (superseded by `tsconfig.json`, and its presence confuses editors). Both declared the identical `@/*` path, so nothing changed.
- [~] Enable `checkJs: true` in `tsconfig.json` and fix errors incrementally; then consider `strict: true` for `src/lib/` and `src/models/`. Partially done: 497 errors -> 292 via three root-cause fixes, and `npm run typecheck:js` now ratchets the remainder in CI so it can only go down. Not yet enabled in `tsconfig.json` itself, because `ignoreBuildErrors: false` means that would break the build. See the twelfth pass.
- [x] Either wire `src/types/index.ts` into the codebase via JSDoc `@type` imports or delete it — deleted, because it had gone stale as well as unused. See the sixth pass.

### Low priority

- [x] Remove unused dependencies: `bcryptjs`, `jsonwebtoken`, `@next-auth/mongodb-adapter`, `classnames`, `react-icons`, plus `mongodb` once the dead `MongoClient` block was gone. 25 packages removed, 0 vulnerabilities.
- [x] Delete the two zero-byte git-tracked files at the repo root: `next` and `d79-directory@0.1.0`.
- [ ] Remove the five duplicated secrets from `.env` — this advice replaces "consolidate into one file", which was wrong; see the fifth pass. Neither file is git-tracked, both are gitignored, and `NEXTAUTH_URL` has already drifted.
- [x] Replace `key={index}` with stable IDs — done for the four sites where it can actually corrupt state (`UserRoleTemplates.js:300`, `PrincipalEmailAutocomplete.js:171`, `admin/users/page.js` audit rows, `UserAnalytics.js:379`). The remaining five are positional-by-definition and were deliberately left; see the seventh pass.
- [x] Add `export const viewport` to `src/app/layout.js`. Verified in the prerendered HTML; `maximumScale` left unset so pinch-zoom still works.
- [x] Standardize on ESM `import` across API routes; several files currently mix `import` and `require` (e.g. `attest/route.js:1-10`). All 45 routes converted, plus 12 that exported handlers via `module.exports`. One deliberate `require` remains, in the PDF route, and now explains itself. Verified against a running production server, not just a passing build; see the twelfth pass.
- [x] ~~Move the `SUPER_ADMIN_APIS` allowlist at `src/proxy.js:12-20` into per-route declarations~~ — not possible as written; middleware cannot import route handlers without pulling the handler graph into the edge bundle. Fixed the underlying problem instead by inverting the default to level 5 and adding a test that fails when a route goes unclassified. Verified there is no gap today: all eight handlers that demand level 5 are covered, and `admin/timeline` enforces level 4 via `requireAdminActor`. This is future-proofing, not a live hole.
- [x] Replace `'unsafe-inline'`/~~`'unsafe-eval'`~~ in the CSP at `next.config.js:61` with nonce-based script allowlisting via the existing proxy middleware. Half done and half **declined**, deliberately. `'unsafe-eval'` is gone from production, verified by a bundle scan and a headless-browser check. `'unsafe-inline'` stays: the nonce would force all 16 prerendered pages into dynamic rendering and require replacing a third-party inline script, against no known injection vector. Decision recorded by the owner on August 26, 2026; revisit if user-supplied content ever reaches the DOM unescaped. See the twelfth pass.
- [x] Reconsider `maxPoolSize: 50` at `src/lib/mongodb.js:56` — that ceiling is per serverless instance. Now 10 max / 0 min, env-overridable.
- [x] ~~Add `experimental.optimizePackageImports` for `recharts` and `lucide-react`~~ — withdrawn, not implemented. Next 16 already optimizes both by default, and the one barrel that isn't covered measured a 0.3% change. See the ninth pass. Wiring up `@next/bundle-analyzer` is still worth doing and is now tracked with the code-splitting item above.
- [ ] Extract admin CRUD from `admin/questions/page.js` (1,220 lines) and `admin/users/page.js` (1,128 lines) into workspace components, following the `SubmissionsWorkspace.js` pattern that already works well.
- [x] Reduce the 311 console statements; route server-side errors through `reportError` and gate client logs behind `NODE_ENV`. Now 144, of which 100 are CLI scripts where stdout is the interface. App-code calls went 211 -> 44, every survivor deliberate and documented, and `no-console` is enabled so it cannot creep back. See the twelfth pass.
- [x] Replace the placeholder images in `docs/` and resolve the `mint.json` / `docs.json` dual config. `mint.json` deleted per Mintlify's own migration guidance; the logo now points at the real `d79logo.png`. The 20 `placehold.co` embeds became source-only notes plus an inventory, because pointing readers at a third-party grey box is worse than showing nothing. See the twelfth pass.

---

#### Fifth pass — August 26, 2026 (operational risk)

This pass corrected two of the audit's own recommendations after checking how the code
actually behaves. Both had overstated the problem.

**Lock acquisition should not fail closed, and "silent data loss" was wrong.** The item
above asked for fail-closed locking on the premise that a Redis outage lets two people
overwrite each other last-write-wins. Reading the save path disproves it: `step/[stepNumber]`
already performs an atomic `findOneAndUpdate` filtered on the step's `revisionCount` and
returns 409 when the revision has moved, and the client always sends its revision with
`mergeStrategy: 'reject'`. Lost updates are therefore already prevented, independently of
Redis. These locks are advisory — they drive the "being edited by X" indicator, nothing
more. Failing closed would have stopped all editing during a Redis outage while buying no
correctness at all, which on a deadline is a strictly worse trade.

What was genuinely broken is that the degraded state was **invisible**. `acquireLock`
returned a `warning` string on its fail-open path that no caller ever read, and the
no-Redis path fell back to a process-local `Map` with no signal whatsoever. So during an
outage the indicator silently reported "nobody else is editing" — a confident wrong answer.
Fixed by returning an explicit `degraded` flag, propagated as `lockDegraded` through the
save response and surfaced once per visit as a toast telling the user their work is saving
but the collaboration indicator can't be trusted. The flag distinguishes "no `REDIS_URL` at
all", which is the normal single-instance local setup and stays quiet, from "configured but
unreachable", which implies multiple instances that can't see each other — the same
distinction `isTokenDenied` already draws. `useAppToast` gained a `warning` variant, since
`danger` would have misrepresented a save that succeeded.

**Two un-unref'd timers in `locking.js` were holding processes open.** Found by writing the
test for the above: the file never exited. The module-level `setInterval` sweep starts
merely by importing `locking.js` and, being ref'd, keeps the event loop alive forever —
the same shape as the eager `client.connect()` removed from `mongodb.js` in the fourth pass.
The per-lock auto-expire `setTimeout` did the same for the length of each TTL after the
request had finished. On Vercel this keeps an instance awake with nothing to do. Both are
now `unref()`'d; neither is load-bearing, as expiry is also enforced by the `expiresAt`
comparison on read. `closeRedis()` was added and exported for the same reason, and is what
a graceful shutdown needs to hand back its connection.

**`maxPoolSize` was a latent outage.** 50 is per serverless instance, not per deployment, so
about ten warm instances reached the 500-connection cap on Atlas M0/M2/M5 — where
exhaustion doesn't degrade, it refuses new connections outright. Now 10 max and 0 min, so
idle instances hold nothing open, overridable via `MONGODB_MAX_POOL_SIZE` /
`MONGODB_MIN_POOL_SIZE` for larger tiers and documented in `.env.example`.

**The env finding was smaller than described, and the advice was wrong.** Neither `.env` nor
`.env.local` is git-tracked and both are covered by `.gitignore`, so no secret is in the
repository. "Consolidate into one file" is also the wrong fix: `.env` for shared defaults
plus `.env.local` for machine-specific overrides is the idiomatic Next.js split, and
`.env.local` here is generated by `vercel env pull` (it carries `VERCEL_OIDC_TOKEN`), so it
will be overwritten anyway. The real problem is narrower — five secrets are duplicated
byte-identically across both files, giving two places to rotate, with `.env` looking
authoritative while being wholly shadowed. `NEXTAUTH_URL` is the one key that has already
drifted, and since it decides `useSecureCookies` in `auth.js`, that is the one worth being
deliberate about. Left for the owner to action, as it means moving live credentials.

**`SUPER_ADMIN_APIS` is not a live hole.** Comparing every `/api/admin/*` handler's own
level check against the allowlist: all eight routes demanding level 5 are covered, and
`admin/timeline` enforces level 4 through `requireAdminActor`. The item stands as
future-proofing against a new route defaulting to level 4, not as a present vulnerability.

Tests are now 109. Lint holds at 0 errors, 80 warnings; build clean.

Still open, highest value first: the ~3,072 lines of dead `Step*.js` and the five unused
dependencies (cheap, large); splitting `form/[id]/page.js`, which is also most of the 80
lint warnings; the nonce-based CSP; the `AbortController` and interval-cleanup leaks on the
client; then accessibility and code-splitting.

---

#### Sixth pass — August 26, 2026 (dead-code purge)

3,572 lines across 20 files deleted, plus 25 npm packages. Nothing here was a behaviour change;
every deletion was verified unreachable first.

**The 14 `Step*.js` components.** Confirmed dead three ways before removing them: no file
outside each one mentions its own name; nothing dynamically resolves a component from a step
number (no `Step${n}` template, no registry map — the only dynamic step lookups in the repo
are the pure key/number helpers in `lib/formSteps.js`); and `renderFormStep` in
`form/[id]/page.js:1207` has exactly three branches — `Step1TableOfContents` for step 1,
`GenericFormStep` for any step present in the question bank, `DefaultFormStep` otherwise.
The per-step components were superseded when steps became question-bank driven. Step 1 is
still hand-built, so `Step1TableOfContents` stays.

**`QuestionStructureTemplate.js`, an orphan this report missed.** Its only apparent
reference is an `import` statement sitting inside its own `usageExample` template string,
which is why a naive grep made it look live. It is documentation shaped like code —
scaffolding instructions for writing exactly the per-step components deleted above, so it
was obsolete twice over.

**`src/types/index.ts` was worse than unused, it was wrong.** The report suggested either
wiring it in or deleting it. Wiring it in would have introduced bugs: it declares
`level: 1 | 2 | 3 | 4` with a comment calling level 4 the admin, while the application
depends on level 5 for super admins throughout, and its `FormData` interface hardcodes
per-screen fields (several already commented out) from the pre-question-bank design. An
unreferenced type that contradicts the runtime model is a trap for whoever trusts it first.
`tsc --noEmit` passes after removal. `src/types/next-auth.d.ts` was kept — ambient
declarations are consumed by the compiler, not by imports.

Also removed: `jsconfig.json`, which declared the same `@/*` path as `tsconfig.json` that
Next.js actually honours; the two zero-byte git-tracked files at the repo root; and six
unused dependencies, `mongodb` among them now that the dead `MongoClient` block is gone.

Effect: lint warnings fell from 80 to 64 without touching a single live file, since 16 came
from the deleted components. Tests hold at 109, `tsc --noEmit` clean, build clean, `npm
audit` reports 0 vulnerabilities.

Still open, highest value first: splitting `form/[id]/page.js`, which is now most of the
remaining 64 warnings; the nonce-based CSP; the `AbortController` and interval-cleanup leaks
on the client; `key={index}`; then accessibility and code-splitting.

---

#### Seventh pass — August 26, 2026 (client-side lifecycle)

**Seven unguarded fetches now cancel on unmount.** All five files used the `cancelled`-flag
pattern from `useQuestionBank` rather than `AbortController`, for consistency with the
existing code. `dashboard/page.js` turned out to have three fetches in a single effect, and
`fetchForms` is also called from four refresh handlers, so the guard is a defaulted
`isCancelled = () => false` parameter — the effect passes a real one, the handlers keep
working untouched.

**The redirect cleanup in `form/[id]/page.js` had two bugs beyond the missing
`clearInterval`.** Its dependency array was `[redirecting, redirectTimeout,
saveReminderTimeout]`, so the cleanup ran on every change to those values rather than only
on unmount — meaning it cancelled the pending auto-save timeout whenever `redirecting`
flipped. It also called `setRedirecting(false)` and `setRedirectCountdown(0)` from inside a
cleanup function, which does nothing on an unmounting component. Both countdown intervals
and both redirect timeouts were being stored in `useState` despite never being read during
render; that is what forced them into the dependency array in the first place. They are now
refs, the cleanup effect has empty deps and clears all four timers, and `cancelRedirect`
clears the interval too — previously cancelling a redirect left the countdown ticking.
Removed the no-op effect whose entire body was two comments explaining that it does nothing.

**`key={index}` was fixed in four places and deliberately left in five.** The distinction is
whether an index key can actually corrupt anything. `UserRoleTemplates.js` was the real
defect: its rows contain text inputs and a delete button, so removing row 2 of 3 made React
reuse row 2's DOM for what had been row 3, moving focus and cursor to the wrong row. Row
content cannot supply the key either, since keying on the name or email being typed would
remount the row on every keystroke; it now carries a counter-assigned `rowId`, stamped at
the only two places rows are created and stripped before the POST so it never reaches the
API. `PrincipalEmailAutocomplete` (interactive list that changes as you type) keys on email,
audit rows key on `_id`, and the analytics legend keys on its title.

The five left alone are the CSV preview rows, the truncated import-error list, and the three
goal-cluster lists. In each the index *is* the identity — the clusters are literally labelled
"Cluster {idx + 1}" — the collections are read-only, and each is replaced wholesale on
refetch. Swapping in a synthetic key would add churn and clarify nothing.

Tests hold at 109, lint at 0 errors and 64 warnings, build clean.

Still open, highest value first: splitting `form/[id]/page.js`, which is nearly all of the
64 remaining warnings; the nonce-based CSP; the accessibility work (shared `Modal` primitive,
label associations, keyboard-accessible cards); `error.js`/`loading.js` boundaries; and the
code-splitting and aggregation-pipeline items.

---

#### Eighth pass — August 26, 2026 (accessibility)

Sequenced ahead of the `form/[id]/page.js` refactor on purpose: this is a NYC DOE
application, so keyboard and screen-reader access is plausibly a procurement requirement,
and unlike the refactor none of it can break the save path.

**A shared `Modal` primitive now backs all 25 dialogs across 15 files**, including the two
drawer variants in `admin/questions`. Every one of them was a bare `<div>` with a
`.app-modal-backdrop` class: no dialog role, no `aria-modal`, and — the part that actually
locks people out — no focus management. Tab moved straight from the dialog into the page
behind it, Escape did nothing, and dismissing a dialog dropped focus back to the top of the
document, so a keyboard user had to tab through the entire page to get back to where they
were. The primitive adds dialog semantics, a Tab/Shift+Tab trap that wraps at both ends,
Escape to dismiss, focus restoration to the element that opened it, and a body scroll lock.

One structural constraint shaped the design: `once-ui-scope.css` sizes modal panels through
the direct-child selectors `.app-modal-backdrop > *` and `> .fill-width`. Introducing a
wrapper element would have silently broken the width of all 25. So the primitive renders the
backdrop itself and passes children through untouched, which also puts the dialog role on
the backdrop — correct enough, since that element is the dialog container. Backdrop clicks
dismiss only when the press lands on the backdrop itself, so a text selection that ends
outside the panel no longer closes the dialog mid-edit, and dialogs mid-submit pass no
`onClose` so they cannot be dismissed while work is in flight.

**Form controls now have programmatic labels.** `Text` from Once UI forwards `as` and extra
props, so `as="label"` with `htmlFor` adds real associations without changing any styling.
In `QuestionCard` the visible prompt is the field's true label but renders as headings and
body text, so the controls point at it with `aria-labelledby` instead; the prompt returns
null when a question carries no copy, so the reference is only emitted when there is
something to reference. `PrincipalEmailAutocomplete` did not accept an `id` at all, which
would have left a dangling `htmlFor` in the transfer-ownership dialog, so it now takes one
and exposes proper combobox semantics over its suggestion list.

**`StatCard` was mouse-only.** It took an `onClick` with no role, no `tabIndex`, and no key
handler, so the dashboard filters it drives were unreachable by keyboard. It now behaves as
a button, including Enter and Space, and reports its state via `aria-pressed`. The
interactive attributes are only applied when an `onClick` is present, so the many decorative
instances stay out of the tab order.

Tests hold at 109, lint at 0 errors and 64 warnings, build clean. Worth noting these changes
are structural and verified only by build and review; the focus trap and screen-reader
labels deserve a manual pass with VoiceOver or NVDA before anyone calls this conformant.

Still open, highest value first: splitting `form/[id]/page.js` (nearly all 64 remaining
warnings, and the one item I would not start without either integration coverage for the save
path or a hook-at-a-time approach with manual verification); the nonce-based CSP;
`error.js`/`loading.js` boundaries; code splitting for `ag-grid`, `recharts`, and `jspdf`;
the aggregation-pipeline rewrites; and expanding `reportError` past 8 of 47 routes.

#### Ninth pass — August 26, 2026 (four small items, two of which this report got wrong)

Four low-risk items chosen because none of them can touch the save path. Two landed as
written; two needed the recommendation itself corrected.

**Route boundaries: eight new files, no crash screens left.** The app had no `error.js`,
`loading.js`, `not-found.js`, or `global-error.js` anywhere, so an unhandled render error
showed the stock Next.js error page and a bad URL showed the stock 404. Rather than repeat
markup five times, the bodies live in `RouteLoading.js` and `RouteError.js` under
`components/ui/`, and the per-route files are three lines each.

Three details were not obvious going in. `global-error.js` replaces the root layout when it
renders, which means none of `layout.js`'s imports have run — no Once UI stylesheet, no
tokens, no theme attributes. Using the component library there would have produced unstyled
markup at exactly the moment things are already broken, so that one file is deliberately
written with inline styles and literal colors. Second, the boundaries do not render
`error.message`; a render-time crash can carry whatever the failing component touched, and
these pages hold student and staff data, so only `error.digest` is shown for correlating a
user report against the server log. Third, `form/[id]/error.js` gets its own wording: the
shared default reassures the user that saved work is unaffected, which is true for the
dashboard and admin pages but would be a lie for the editor, where a crash can discard
answers typed since the last autosave. That one says so instead.

These boundaries do **not** report to Sentry. `src/lib/reportError.js` requires
`@sentry/node`, which cannot run in the browser, and client reporting needs
`instrumentation-client.ts` — still open. They log to the console so the failure is at least
observable in development, without pretending it reached a monitoring backend.

**The `formatAnswer` duplication was real; the suggested fix was not.** Both export routes
carried byte-identical copies of the answer-formatting block, so a change to how (say)
checkbox answers render had to be made twice or the PDF and DOCX outputs silently disagreed.
But this report said to fold them into `schoolYearSettings.formatAnswer()`, and that function
has genuinely different semantics: it serves the year-over-year comparison view, where it
renders booleans as `'Yes'`/`'No'`, flattens tables to plain text for diffing, and emits
compact JSON. The exports need `formatYesNo`, real table objects to hand to the table
builders, indented JSON, and a ruled placeholder for unanswered questions. Merging them would
have quietly changed both features. The extraction instead landed as `resolveExportAnswer` in
`lib/exportTables.js`, which both routes already imported.

The PDF route's 5,000-character truncation is now an opt-in `maxLength` rather than baked in,
since only PDFKit needs it. Nine tests in `exportTables.test.js` pin the behavior, including
the two cases most likely to regress silently: a `false` checkbox is an answer (`'No'`), not a
blank, and an empty table still resolves a grid so it prints for someone completing the plan
on paper. Two of those tests failed on first run — they used object-keyed rows when the real
table shape is arrays of cells — which is a fair argument for having written them.

**`optimizePackageImports` was withdrawn rather than implemented.** Next 16.3.3 already
optimizes `lucide-react` and `recharts` by default, so this report's specific recommendation
would have added a line restating a default. The one barrel not covered is
`@once-ui-system/core`: 65 importers, no `sideEffects: false`, and it does publish
`./components/*` subpaths for the rewrite to target. Measured before and after, client chunks
went 7,760 KB to 7,736 KB — 0.3%, indistinguishable from noise. The Next docs describe the
flag as experimental and not recommended for production, so trading that warning for 24 KB on
a NYC DOE production app is not a good deal. `next.config.js` now carries a comment with the
measurement so nobody reopens this without bundle-analyzer evidence.

**The viewport fix is a one-liner with a real consequence.** With no `viewport` export,
Next.js emits no viewport meta tag and mobile browsers fall back to a ~980px virtual
viewport, rendering the whole app zoomed out. `maximumScale` is deliberately left unset:
capping it would block pinch-zoom, which anyone relying on magnification needs. Confirmed
present in the prerendered HTML rather than assumed.

Tests 109 to 118, lint unchanged at 0 errors and 64 warnings, build clean, 404 page
prerendered with the new copy. The boundaries are verified by build and by reading; nobody has
yet forced a runtime error to watch one catch, which is the obvious next check.

#### Tenth pass — August 26, 2026 (code splitting, measured)

The first thing this needed was a way to measure, because Next 16's Turbopack build prints no
"First Load JS" column and writes no `app-build-manifest.json`. Total bundle size is the wrong
metric anyway — splitting moves bytes out of the initial download rather than deleting them,
and total actually *rose* here, 7,760 KB to 7,804 KB, from chunk overhead. Reporting that
number would have made a large win look like a regression.

`scripts/measure-initial-js.js` (also `npm run measure:js`) instead reads the `<script src>`
tags out of each prerendered route's HTML, which is what the browser actually fetches before
hydration, and sums them. It also greps those chunks for library fingerprints so the split can
be verified rather than assumed. Numbers below are from building both ways and measuring:

| Route | Before | After | Change |
| --- | --- | --- | --- |
| `/dashboard` | 1,801 KB | 1,261 KB | −540 KB (−30%) |
| `/admin/goals` | 2,709 KB | 1,235 KB | −1,474 KB (−54%) |
| `/admin/users` | 1,763 KB | 1,300 KB | −463 KB (−26%) |
| `/admin/submissions` | 1,962 KB | 1,259 KB | −703 KB (−36%) |
| `/login` (control) | 1,207 KB | 1,207 KB | 0 |

No heavy library remains in any route's initial payload. All four are still in the build,
reachable on demand: recharts in one 394 KB chunk, ag-grid across two totalling 994 KB, jspdf
323 KB, html2canvas 516 KB.

**The dashboard was the worst offender and matters most**, because it is the page every
principal lands on. Ten widgets were imported eagerly and every one of them is gated behind a
non-default `activeView`; the five year-setup panels additionally require level 5. So a
principal opening their dashboard downloaded the entire district-admin surface, recharts
included, to render an overview that uses none of it.

**recharts could not be split by wrapping the chart components.** It composes through its
children and inspects their types — `ResponsiveContainer > PieChart > Pie > Cell` — so lazily
loading the pieces individually breaks the composition. The unit that can actually move is the
whole subtree, which is why the goals page's Graphs tab became `GoalsChartsPanel.js` and the
one chart in the Clustering tab became `ClusterScatterChart.js`. ag-grid needed the opposite
treatment: `AgGridReact` takes plain props, so a pass-through `DataGrid.js` that owns the
imports, the two stylesheets, and the `ModuleRegistry.registerModules` side effect was enough,
and all three call sites changed by name only.

`ssr: false` is set for ag-grid, the charts, and `FormViewer`, all of which measure or
rasterize the DOM and have nothing useful to render on the server. The dashboard widgets keep
SSR since they are ordinary markup.

One correction worth recording: the first version of the measuring script reported ag-grid
still in `/admin/goals`'s initial payload, which looked like the split had failed. The
fingerprint was `ag-theme-alpine` — the CSS class the page puts on its own wrapper div, which
lives in the page chunk whether or not the library is bundled. A working split looked broken
because of the measurement, not the change. The fingerprints now avoid class names.

Tests hold at 118, lint at 0 errors and 64 warnings, build clean. Caveat: verified by build
output and bundle inspection, not by clicking through the tabs. Each dynamic boundary now has
a spinner fallback where content used to appear synchronously, and the five affected tabs
deserve a manual pass — particularly ag-grid, whose stylesheets now arrive with the chunk
rather than at page load.

#### Eleventh pass — August 26, 2026 (tests, query pushdown, admin default, error reporting)

Four items. Tests went 118 to 174.

**The unit tests found two things, which is the argument for writing them.**

`canManageUser.js` has an unreachable guard. `if (actor.level < 5 && target.level > 3)` can
never be the rule that decides an outcome: it only applies when the actor is level 4 or below,
and any target above level 3 has already been refused by the `target.level >= actor.level`
check above it. It is harmless defense in depth and is now asserted rather than deleted, so
that if someone loosens the rank check the guard's behavior is pinned instead of discovered in
production. A first draft of that test asserted a level-6 actor would be blocked, which was
wrong in the other direction — both school-scoping guards are written `actor.level < 5`, so a
level-6 actor bypasses them exactly as level 5 does. The test now documents that.

`formProgress.js` has a subtler one. `completedStepCount` prefers the `stepCompletion` map
over the legacy `completedSteps` array, but only when the map has at least one truthy entry.
That `fromFlags > 0` guard is load-bearing for partially migrated forms: a form carrying a
zeroed map alongside a real legacy array would otherwise report zero progress on a form that
has some. Also pinned: progress beyond the total is not clamped, so a form with more completed
steps than the step count reports over 100%. Documented rather than fixed, since it is not
currently reachable from the UI.

**The same authorization predicate existed in three places.** `canManageTarget` in
`src/lib/canManageUser.js`, and byte-for-byte copies named `canManageUser` in
`admin/users/page.js` and `components/admin/UsersTable.js`. Identical today, which is exactly
when this is worth fixing — the two client copies decide which Edit and Delete buttons render,
so any future change to the server policy would have left the UI offering actions the API
refuses, or hiding ones it would allow. Both now import the lib, and the lib is the thing
under test.

**The `find({})` routes.** Three of the four were the same problem: filtering by school year in
JavaScript because the year is only sometimes a stored field. `inferSchoolYear` returns
`form.schoolYear` when set and otherwise derives it from `createdAt` against a July 1 boundary,
which is mechanizable — so it is now `schoolYearQuery()` in `schoolYear.js`, used by
`admin/goals`, `admin/forms/export`, and `admin/forms/rollover`. Rollover was also the one
missing `.lean()`; it had been hydrating every form in the collection as a full Mongoose
document in order to keep one per school for a single year. Safe to add because
`cloneFormData` already handles a non-document source explicitly.

One trap worth recording. The obvious translation is Mongo's `$year`/`$month`, and it is
wrong: those default to UTC while `currentSchoolYear` reads the month via `Date#getMonth`,
which is local. For a form created within a few hours of July 1 the two disagree — invisible
in production, where Vercel runs UTC, and reproducible only in local dev. The filter instead
compares `createdAt` against `new Date(year, 6, 1)`, keeping the boundary in the same timezone
as the function it mirrors, whatever that timezone is.

`admin/timeline` was a different problem — already school-scoped and projected, but tallying
every submission in a `forEach`. It is now a single `$group` that accumulates all fifteen
counts server-side. Two things surfaced while rewriting it: the bucket named `10_days_ago`
actually holds the *most recent* ten days, and the `today` bucket has never been incremented
by anything. Both preserved verbatim, since the dashboard reads those keys.

Verification here was against the real collection rather than by reasoning. The 57 documents
split 29 with no stored year (created Nov–Dec 2025), 27 stamped `2026-2027`, and 1 stamped
`2025-2026`. `schoolYearQuery` returns 30 for 2025-2026 and 27 for 2026-2027 — a complete
partition, no gaps, no double-counting. The timeline pipeline reproduced every hand-computed
count including the non-obvious one: weekly submissions came out zero because those forms were
created at 15:57Z on the 19th, just under the rolling seven-day cutoff.

**The admin allowlist could not be fixed as the audit described.** "Move `SUPER_ADMIN_APIS`
into per-route declarations" is not implementable — middleware would have to import the route
handlers to read their declared level, which pulls the handler graph into the edge bundle.

But the allowlist was not really the problem; the *default* was. Anything under `/api/admin`
that nobody remembered to list fell through to level 4, so the cost of forgetting was a silent
privilege leak. That is now inverted in `src/lib/adminRouteLevels.js`: admin routes require
level 5 unless they appear on an explicit level-4 list, so forgetting locks out a super-admin
feature — noticed immediately — instead of exposing one. The five level-4 grants are the
handlers that scope their own reads to the actor's school, and each carries a comment saying
where.

The list stays honest via `adminRouteLevels.test.js`, which walks `src/app` and fails if a
route is unclassified, if a listed path no longer exists, or if the set of level-4 grants
changes without someone updating the test. Access is unchanged: the classification reproduces
exactly what the old prefix matching permitted, so this is a pure default inversion.

**`reportError` went from 8 routes to 45 of 46**, the holdout being the NextAuth catch-all,
which has no error handling of its own. This was safe to automate because every catch block
already called `console.error` and `reportError` calls `console.error` itself before forwarding
to Sentry, making the swap semantics-preserving for local logging.

Two judgment calls in the codemod. It only rewrites calls whose second argument is clearly an
error binding, which left `console.error('Form not found:', formId)` alone. And it skips
messages built from interpolated template literals, because in this codebase those are all
per-item logs inside loops — the five in the PDF and DOCX exporters fire per question and per
field, so reporting them would mean hundreds of Sentry events from one malformed export. They
remain console logging; the failure they contribute to is still reported by the enclosing
handler.

**Client-side error reporting is left open on purpose.** `@sentry/nextjs` is the standard
answer but costs roughly 35 KB gzipped on every page, which works directly against the tenth
pass, and it needs a public DSN plus a `next.config` wrapper. The cheaper alternative — global
`error` and `unhandledrejection` handlers posting to a rate-limited internal route that reuses
the server `reportError` — adds no dependency and no bundle weight, but gives up breadcrumbs,
session replay, and source-mapped stacks. Worth noting that `SENTRY_DSN` is currently blank, so
nothing is reaching Sentry from the server either; provisioning a DSN is the prerequisite that
makes either option meaningful.

Tests 174 passing, lint 0 errors and 64 warnings, build clean, middleware still compiles.
Caveat: the query and aggregation changes are verified against production data and unit tests,
not by loading the four admin screens, so the goals, export, rollover, and timeline views
deserve a click-through.

---

#### Twelfth pass — August 26, 2026 (consistency, logging, types, CSP)

Four of the remaining low-priority items, plus partial progress on two that turned out to
hide real decisions.

**ESM across the API routes.** All 45 route files now use `import`/`export` only: about 330
top-level `require` calls converted, 12 files that exported handlers via `module.exports = { GET }`
switched to `export async function`, and 19 lazy `require` calls inside function bodies hoisted.
The one survivor is `pdfkit` in the PDF export route, which cannot become an import for two
independent reasons now recorded at the call site — it has to address the CJS entry directly
because the ESM one breaks `@swc/helpers` through Turbopack, and it has to sit in a try/catch so
a broken pdfkit degrades to a reported error instead of taking the route module down at load.

A passing build only proves the imports resolve, not that the CommonJS interop works, and
`src/lib` and `src/models` are still CommonJS. So this was checked by running the production
server and hitting the routes: `/api/public/overview` returns 200 with live data, which
exercises default model imports, named lib imports, mongoose, and Redis in one request. The
rest correctly return 401 at the middleware.

**Logging.** Added `src/lib/logger.js`, which splits diagnostics from failures: `debug` and
`warn` minify to empty functions in the production client bundle while `error` keeps its
`console.error`. That was verified by reading the built chunks rather than assumed, and the
verification corrected the claim — the call sites and their argument strings survive, so a
`logger.debug` in a hot loop still costs argument construction. The doc comment says so.

89 `console` calls across 12 client components moved to it. Lib-level failures in
`activeEditors`, `auth`, `auditLogger`, and `questionBank` now go through `reportError`.
`redis.js` and `locking.js` deliberately do not: both run on every request or every autosave,
so an outage would generate one Sentry event per operation and bury the incident it was meant
to reveal. Both files now say that where a reader will find it.

One real find along the way: `admin/forms/share/route.js` logged the form's school and the
user's school on every request. Deleted.

`no-console` is now on as a warning allowing `warn` and `error`, so debug tracing cannot come
back silently. Enabling it surfaced exactly three findings, all legitimate exceptions (the CLI
measurement script and `logger.js` itself), which is a good sign the app code is clean. Counts:
311 total at the start of the audit, 144 now, of which 100 are the `src/scripts` CLI tools where
stdout *is* the interface. App code went 211 to 44, and each of the 44 is deliberate.

Separately, `PrincipalEmailAutocomplete.js` uses four hooks and had no `'use client'`
directive. It worked only because every current importer is already a client component, so the
first server-component import would have broken it. Fixed.

**Types.** `checkJs` reported 497 errors. Rather than grinding through them, three root causes
accounted for 205:

- Every model used `mongoose.models.X || mongoose.model(...)`, which gives TypeScript a union of
  two `Model` types whose call signatures it cannot reconcile — so all 138 `Model.find(...)`
  calls in the app reported "This expression is not callable". Naming the type collapses the
  union. `AuditLog` and `User` also now declare their custom statics, which is documentation as
  much as typing.
- `authOptions` had no type, so `strategy: 'jwt'` widened to `string` and every one of the 66
  routes passing it to `getServerSession` failed. One annotation.
- `types/next-auth.d.ts` now augments `Session` and `JWT` with the fields this app adds. Worth
  doing on its own merits: `session.user.level` drives every authorization check in the
  codebase and was previously untyped and invisible to the editor.

That leaves 292, mostly React prop inference in components. `checkJs` is still off in
`tsconfig.json`, because `ignoreBuildErrors: false` means turning it on would break the build —
so instead `npm run typecheck:js` runs it against `tsconfig.checkjs.json` and compares the
count against a committed baseline, failing if it grows. It also fails when the count *drops*,
telling you to commit the lower floor, which is what stops the baseline drifting upward. Both
directions were tested by injecting an error. CI runs it alongside a strict `typecheck` over the
`.ts` sources, which are clean.

Two errors were investigated as possible bugs and were not: `readAsText` guarantees the
`FileReader` result is a string, and `acquireLock` includes `degraded` on every path a caller
reads it from. The `Date.now()` assignments in the save hooks became `new Date()` for clarity;
mongoose was casting them correctly already.

**CSP, partially.** `'unsafe-eval'` is now development-only. React Refresh needs it; a
production build does not. Evidence before removing it: zero `new Function(` across all 666
client chunks and the server build, including the ag-grid, recharts, jspdf, and html2canvas
chunks, and the four `eval(` hits are keyword strings inside a syntax-highlighter's regexes.
Then a headless-Chrome run over `/`, `/login`, and `/about` reported no violations. Also added
`object-src 'none'` and `upgrade-insecure-requests`.

`'unsafe-inline'` stays, and the write-up in the low-priority list was too optimistic about the
nonce being a middleware change. Two costs it did not anticipate:

1. A nonce must be unique per request, so it cannot be baked into a prerendered page. 16 of
   this app's 19 pages are prerendered today, including `/`, `/about`, and `/login`. Reading the
   nonce in the root layout would push all of them into dynamic rendering.
2. `ThemeInit` from `@once-ui-system/core` injects an inline `<script>` via
   `dangerouslySetInnerHTML` and accepts no nonce prop. Under a nonce policy the browser blocks
   it, and because a nonce policy makes the browser ignore `'unsafe-inline'`, there is no way to
   keep both. Adopting nonces therefore means replacing a third-party component's script with a
   local nonce-aware copy.

Hashes are not a way out: Next's streaming `self.__next_f.push` scripts differ per page and
render, so only a nonce can cover them. The remaining question is whether losing static
rendering on 16 pages is worth closing an XSS amplification path, on an internal app with no
known injection vector — which is a judgement call for the owner, not a mechanical fix.

Tests 174 passing, lint 0 errors and 64 warnings, `tsc` clean, build clean, production server
smoke-tested.

---

#### Thirteenth pass — August 26, 2026 (client-side error reporting)

Took the zero-dependency option over `@sentry/nextjs`. The reasoning from the eleventh pass
still holds — Sentry's browser SDK costs roughly 35 KB gzipped on every page, which works
against the code-splitting work, and `SENTRY_DSN` is blank so it would capture nothing today —
but the deciding factor is that this choice is not exclusive. `/api/client-errors` funnels into
the same `reportError` the server already uses, so provisioning a DSN later starts capturing
browser errors through the existing path with no further changes. Until then the reports land in
the platform logs, which is still the difference between knowing and not knowing.

The hard part of a client error reporter is not sending the error, it is not making a bad
situation worse: a component throwing in a render loop can throw thousands of times a second.
Three guards, and both of the ones that matter were tested rather than reasoned about:

- An in-flight flag, so a failure inside the reporting path cannot recurse.
- Signature dedupe, which is what actually kills the render-loop case.
- A five-per-page-load budget, as a backstop for errors that vary slightly each time.

Driving a real headless browser: one uncaught error and one unhandled rejection each produced
one report; the same error thrown 50 more times produced none; six distinct errors after that
produced exactly three, stopping at the budget of five. Five entries reached the server with
their stacks intact. `sendBeacon` is used where available so a report survives the navigation or
tab close that often follows a crash.

The endpoint is unauthenticated on purpose, because the sign-in page is exactly where a broken
deploy strands people. That makes it a public write endpoint, so it is metered in the middleware
at ten per five minutes per IP before it reaches the route, and every field is truncated. Also
verified: 405 on non-POST, 204 on success, 429 once the window is exhausted, and 204 with
nothing reported for a payload with no message.

One correction during the work: the limiter was first written `failClosed: true`, which would
have rejected every report in a deployment without Redis. It now uses the same `failClosed` rule
as the auth limiter directly above it, so the behavior matches the rest of the app instead of
inventing a stricter rule in one place.

Tests 174 passing, lint 0 errors and 64 warnings, `tsc` clean, `checkJs` baseline unchanged at
292, build clean.

---

## Note on scope

Findings in sections 2.2, 4.4, and 5.1 were verified by reading the cited source directly. Dependency data comes from a live `npm audit` run. The file-size, duplication, and `'use client'` counts come from repository-wide analysis. No runtime or penetration testing was performed — the authorization findings are based on static reading of the handlers and the middleware, so exploitability should be confirmed against a staging environment before assigning final CVSS-style severity.
