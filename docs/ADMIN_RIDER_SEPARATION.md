# Separate staff administration and riders

Apply `supabase/migrations/009_separate_admin_accounts.sql` after 008, before running the updated backend. It must run as the migration owner. Do not modify already-applied migrations 001–008.

## Data model

- `auth.users`: shared login identity and password storage managed by Supabase.
- `admin_users`: staff identity details (`id`, email, full_name, handle, status, role_id, timestamps). `id` references `auth.users`; `role_id` references `admin_roles`.
- `admin_roles`: staff permissions. Protected Super administrator grants read/write/staff management. Operator grants read/write. Viewer grants read only. Custom roles may grant read and optionally write; staff management remains reserved for Super administrator.
- `profiles`: rider identity, rider/road-captain/club-admin roles and riding data. `is_rider` excludes retained historical admin-only profile shells from rider APIs and dashboard metrics. No rider role grants staff access. Existing domain records and foreign keys are preserved.
- `admin_audit_log.actor_id`: now references `auth.users`, allowing administrators to be audited without requiring rider profiles.

The common identity fields follow the same conventions across staff and rider records; domain columns remain appropriate to each account type. Passwords are not duplicated in either table. Existing super-admin identities are copied before legacy super-admin rider roles are removed. A deliberate future dual staff/rider identity can have both records; the migration does not automatically enroll admins as riders.

New staff creation goes through the backend's Supabase Admin API with trusted `app_metadata.account_type=admin`, which makes the profile trigger skip rider enrollment. Email/password login still uses Supabase Auth. The staff-record/audit save is transactional; newly provisioned Auth logins are removed if that save fails. No invitation emails are sent. Initial passwords require at least 12 characters and are not written into audit payloads.

Backend staff authorization reads only admin_users → admin_roles. Rider status and role have no effect on administrative permission. Missing or suspended admin accounts are denied. Super administrators cannot remove their own role/access. The protected super-admin role cannot be edited. Administrative tables and mutation RPCs are inaccessible directly to public/rider roles; backend service credentials are required.

## UI

Separate Admin accounts and Admin roles modules are present under System & security. Registered riders remains separate. Admin creation, role/status editing, role creation and permission editing use the same compact tables/dialog conventions. Dropdown arrows/options, radio/checkbox states and keyboard focus are styled consistently across Day/Night/System themes. Appearance uses an accessible radio segment group. No background data polling was added; Refresh remains explicit.

## Verification

Run backend npm test and npm run build; ERP npm test and npm run build. SQL verification lives in `supabase/tests/009_admin_separation.sql` and rolls back its fixture changes. After applying 009, run `node scripts/check-admin-schema.mjs` and verify existing administrator login, viewer/ operator restrictions, creation of a new admin without a rider record, rider counts, and existing club/ride relationships.

Live read-only preflight confirms all earlier tables/RPCs are reachable, while admin_users/admin_roles and profiles.is_rider are currently missing. Migration 009 has NOT been executed from this workspace: no SQL connection or management token is configured. API authorization will require 009; there is intentionally no fallback to legacy rider privileges. Browser appearance/device QA is still pending because prior preview access was denied. Historical migration 007 is not a post-009 password reset or reprovisioning tool; migration history should run each migration once.

Migration correction: the role-identifier regex and function dollar-quoting were repaired. The complete current 009 file now executes successfully in isolated PostgreSQL (PGlite) against a minimal pre-009 schema. The rollback-only 009 verification script passes, and replaying 009 also succeeds. These checks do not apply the migration to the hosted Supabase database.
