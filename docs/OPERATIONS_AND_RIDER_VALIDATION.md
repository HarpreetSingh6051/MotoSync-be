# Admin operations and rider integration

## Implemented

- Admin dashboard: D3 registration/ride trends, ride-status chart, plan distribution, country heat map, city/country rider filters. Locations come from profiles, not GPS.
- Skeleton states for initial loads, refreshes, detail lists, role lookups and operation lookups. Reads use explicit Refresh; there is no feed polling.
- Audited group creation with owner membership; ride scheduling with captain enrollment; draft/published/scheduled group or platform announcements and unpublishing.
- Maintenance transitions create operational alerts. Administrators can acknowledge them. These are not infrastructure monitoring or emergency dispatch alerts.
- Aggregate CSV exports: platform totals, countries, cities and ride status. Formula-like strings are escaped; no hidden row limit in geographic aggregates.
- Separate authenticated `/rider` APIs: own profile, paginated feeds, membership/RSVP operations, group chat and expense reads. Identity is derived from verified JWTs; admin-only accounts are rejected.
- Rider mutations enforce active status, feature availability, group privacy/membership, captain protection and atomic ride capacity. Direct client writes to memberships, participation and chat are revoked by migration 011.

## Database

Apply migrations in order through `011_rider_operations.sql`. Migration 010 supplies analytics, announcements and alerts; 011 supplies rider operations and gateway-only writes. Both are replayable. Existing tables and 010 aggregates passed a read-only hosted schema check. The hosted 011 function was present, and private-fixture API workflows succeeded against the local backend using the hosted database.

Rollback-only SQL regression scripts are in `supabase/tests/010_admin_operations.sql` and `011_rider_operations.sql`. They require a trusted migration owner and a profile fixture. Isolated PostgreSQL validation covered migrations 009–011, replay of 010, alert generation/acknowledgement, group and captain enrollment, private announcements, draft/future/expired suppression, RSVP capacity, idempotence, membership constraints and maintenance checks.

## Repeating live checks

`node scripts/check-admin-schema.mjs` only reads schema/data availability and never prints credentials.

`node scripts/test-rider-live.mjs --allow-fixtures` requires `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_RIDER_EMAIL`, `E2E_RIDER_PASSWORD` in backend environment, plus normal Supabase settings. Optional `E2E_API_BASE` defaults to local port 4000. It creates a private group/ride, group-scoped announcement, self-test chat and temporary second rider, then deletes those fixtures. The primary test rider is retained. Administrative audit entries are intentionally retained.

Verified live flows: admin password login and all tested read modules/exports (200); rider denied admin endpoints (403); admin-only identity denied rider endpoints (403); rider login/profile; owner membership and captain enrollment; private record isolation; joining/canceling an RSVP; persistent group chat and non-member isolation; announcement publish/audience/unpublish; expense reads; actor-spoof rejection; cleanup.

Final API verification also ran through an isolated Nest server using the hosted database: Expo web CORS preflight passed, and a direct authenticated membership insert was denied with PostgreSQL permission error 42501. Test totals: backend 77/77, admin 5/5, rider client 6/6. Local API CORS now includes `http://localhost:8081`; restart the regular backend process to load its environment changes.

## Release limits

API integration is not device UI acceptance. Browser/emulator screenshots and physical-device smoke tests remain outstanding. The mobile app explicitly marks radar/intercom, payment settlement and receipt scanning as unavailable; original visual prototypes are opt-in demos. Push notifications, self-service rider signup/recovery and production payment processing are not implemented by this change. Announcement publishing creates an in-app feed; it does not send push/email messages.

Do not expose the bootstrap admin password in production. Test account credentials are kept outside the code repositories in the local outputs folder; E2E passwords remain in ignored backend environment files.
