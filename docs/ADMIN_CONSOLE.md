# Admin console integration / phase 1

Implemented in backend + admin ERP only. The active admin entry point is now AdminConsole; the previous demonstration dashboard remains in source but is not mounted.

## Setup required before live acceptance

1. Apply migrations 001-005 if not already applied, followed by supabase/migrations/006_admin_console.sql using the database migration owner. Migration 006 adds service-role-only transactional management/audit RPCs and dashboard aggregates, and resets catalogue prices to zero for free launch. Review this effect against any existing live subscriptions before applying to an established product.
2. Configure SUPABASE_SERVICE_ROLE_KEY in the backend environment only. The local configuration currently has no service-role credential or database connection. The backend now fails closed rather than substituting the anonymous client.
3. In the ERP configure VITE_API_BASE_URL, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Register an administrator through the normal Supabase Auth provisioning process and assign their existing profile role=super_admin, status=active using a trusted database operator. There is no public self-promotion endpoint.
4. Include the ERP origin in backend CORS_ORIGIN. Start backend and ERP. Sign in with the administrator credentials.

## Implemented flow

- Authenticated active-super-admin guard for the admin, users and reports controllers, draft catalogue reads, and mutations on plans/flags/sounds/campaigns/clubs. Access tokens are verified with Supabase Auth; profile role/status are checked on each privileged request. Guard is independent of the configured URL prefix.
- Dashboard: database counts, last 30 calendar days of registration totals, actual plan assignments. No seeded revenue or purchases.
- Riders: name search, pagination (25/page), status and active plan assignment, profile details and group membership inspection. Self-suspension is blocked. Role escalation is excluded from editable fields.
- Groups: name search/pagination, membership profiles and roles, verification/revocation. Membership details currently cap at 1,000 per group/user and disclose that limit in the group view; further pagination is needed for larger groups.
- Plans: create/edit, feature lists, audience, sorting, draft/published states. Unpublishing archives without deleting referenced plans. Backend holds all prices at zero. Mutations and audit insertions share a database transaction. No payment collection.
- Shared public GET /api/v1/plans returns only active plans and features. Existing mobile consumers can use the same catalogue. The landing website still uses its previous static marketing offers; connecting its pricing section is a separate consumer integration, not completed in this phase.
- Profile status/plan and club verification changes use audited transactions; audit history shows the latest 100 actions.
- ERP never falls back to sample records on errors. Loading, empty, error/retry and save states are explicit. Collapsible left navigation, responsive layout, keyboard dialog handling, and navy/lime/cyan palette.

## Limits and verification

Automated permission and validation tests cover anonymous access, invalid/expired sessions, wrong or inactive roles, valid administrators, profile escalation rejection, free-launch pricing and transaction failure. Both repos compile and build.

Live database transactions and SQL migration execution are NOT verified: required backend credential and database connection are missing. Browser screenshots at 360/390/430 widths and desktop remain pending because preview access was previously denied; no browser workaround was used. Real UI rendering, focus restoration, hydration and live cross-client plan refresh still need acceptance checks.

The paid subscription lifecycle, invoices, payments, plan entitlement enforcement in rider features, invitation/provisioning workflow, granular admin roles, group member removal/role editing, and additional legacy modules (flags, sound vault, campaigns) are not part of the new console yet. Legacy mutating routes use the new admin guard but their existing DTO/audit coverage requires a later hardening phase. Rider-side API authentication remains a separate backend task; this phase is not a complete platform security audit.

Acceptance after setup: sign in as admin and as rider; verify rider gets 403; compare directory counts with DB; edit a rider and inspect audit; inspect a private group's members as admin; create a draft plan (absent publicly), publish it (present publicly), unpublish it (absent, assignments preserved); reload to confirm persistence; disconnect network and verify errors rather than sample data.

Final local verification: 10 tests passed across three backend suites; backend build, ERP typecheck and ERP production build passed. HTTP smoke against a locally started backend returned health 200 and rejected four unauthenticated privileged reads plus a plan write with 401. This verifies route wiring and guard execution without claiming live database success.

## Default administrator bootstrap

Migration `007_bootstrap_super_admin.sql` creates the initial confirmed email/password account:

- Email: `admin@motosync.com`
- Initial password: `password`
- Application profile role: `super_admin`; status: `active`

Apply migrations through 007 to each fresh Supabase database as the trusted migration owner. Deploying the Node/Vercel code alone does not execute database migrations; the deployment pipeline must run the database migration step separately. Against an already migrated database, ordinary redeployments leave the existing account untouched.

The migration creates both the Supabase Auth user/email identity and its application profile in a transaction. `auth.users.role` remains `authenticated` and Auth's `is_super_admin` remains false: application administration is granted through `public.profiles.role`, not database/Auth infrastructure privileges. A bootstrap audit record is created without the password. Replays do not reset a changed password, reactivate a disabled account, or duplicate the user/audit record. If this email already belongs to a non-admin account, the migration stops instead of silently promoting it.

Change the initial password in Supabase Auth after the first login, before exposing the admin publicly. The backend still requires `SUPABASE_SERVICE_ROLE_KEY`. This migration does not add user-creation controls to the console; provision additional users via Supabase Auth until that admin module is implemented.

Validation limitation: no PostgreSQL/Supabase CLI or live database connection is available in this workspace, so SQL execution, replay, and password login must still be verified on the target Supabase instance. Supabase manages the Auth schema; validate this seed against the deployed Auth version.

## Backend authentication environment

The admin frontend now routes Auth requests through `/api/v1/auth/v1/{token,user,logout}`. The gateway reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from backend environment settings; the Supabase service no longer substitutes a hard-coded project or key. Missing configuration fails startup explicitly. Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only. Configure `CORS_ORIGIN` with the local admin origin and deployed admin hostname for the matching environment.

Local password login was tested through the backend: the configured provider returned 400 `invalid_credentials` for the requested bootstrap login. No session was issued. The default account migration remains unapplied/unverified because no database connection is available here. Apply migration 007 or check the existing account's password before retesting.
