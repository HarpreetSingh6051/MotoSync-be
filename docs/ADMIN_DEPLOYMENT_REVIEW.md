# Admin deployment review — 2026-11-15

## Immediate 503 cause

The screenshot identifies a missing server-only database key. Login uses the public Auth key, so login success does not establish admin database readiness. Backend now supports SUPABASE_SECRET_KEY (sb_secret_...) as well as SUPABASE_SERVICE_ROLE_KEY. Set one in backend .env.local and in the corresponding Vercel environment, then restart/redeploy. The supplied project URL and public/publishable key do not replace this credential. Do not add the secret to any VITE_ variable.

Official key documentation: https://supabase.com/docs/guides/getting-started/api-keys

## Implemented modules and data contracts

| Module | Endpoint | Main tables | Behaviour |
|---|---|---|---|
| Overview | GET /admin/dashboard | profiles, clubs, club_members, rides | counts + registration and plan aggregates |
| Riders | GET/PUT /admin/users | profiles, subscription_plans | search, paging, account status, plan assignment |
| Group membership | GET /admin/users/:id/groups, /admin/clubs/:id/members | club_members, profiles, clubs | member details and roles |
| Groups | GET/PUT /admin/clubs | clubs | search, paging, verification |
| Plans | GET /plans/admin, POST/PUT /plans | subscription_plans | drafts, feature lists, publishing, free launch |
| Rides | GET /admin/rides | rides | paged real ride records |
| Features | GET/PUT /admin/config/flags | app_feature_flags | enabled / disabled / maintenance + user message |
| Sounds | GET/PUT /admin/config/sounds | exhaust_sounds | create/edit/archive catalogue |
| Campaigns | GET/PUT /admin/config/campaigns | sponsored_campaigns | create/edit/archive catalogue |
| Subscriptions | GET /reports/purchases | subscriptions | actual subscription records; no sample transactions |
| Audit | GET /admin/audit | admin_audit_log | last 100 admin events |
| Settings | GET /health | environment | API endpoint and theme preference |

All paths above follow the configured /api/v1 prefix. Day/Night/System preferences persist locally; System tracks OS preference changes. Sidebar scrolls when necessary.

## Migration 008

Apply supabase/migrations/008_feature_availability.sql after 007. It extends the existing feature table instead of introducing a competing feature source. Existing is_enabled consumers stay compatible. Configuration saves and audit events commit together; RPC access is restricted to service_role. Public API reads for rides, clubs, sounds and campaigns enforce their matching feature key: disabled returns 404, maintenance returns 503 with the administrator message, and an unavailable flag schema fails closed. Admin management remains accessible so outages can be cleared.

Other feature keys remain a shared client configuration contract through GET /flags. Features without a backend endpoint need explicit rider/website consumption before they can be described as enforced there. Mobile/website code was not changed in this phase. This does not implement plan entitlements or payment processing.

SQL verification script: supabase/tests/008_feature_availability.sql, run as a trusted database operator. It rolls back its smoke fixture. Migration and SQL test have NOT been executed here because no database connection/server secret is configured.

## Logs and diagnostic checks

Both local and Vercel entry points now log method, path, status, duration and generated request ID for every completed request. Error logs include exception type and database error code where available. Headers, request bodies, passwords, access tokens and database payloads are excluded. X-Request-Id is returned on responses, and exception JSON includes requestId. Proxy Auth errors appear in request-completion logs as well. Vercel CORS now uses the configured CORS_ORIGIN list rather than wildcard credentials.

Run node scripts/check-admin-schema.mjs from the backend folder after adding the secret. It checks all ten console tables plus dashboard RPCs. A startup warning explains missing admin credentials. Existing running processes must be restarted to load both configuration and code.

## Additional correctness work

The legacy user/group/ride services no longer replace empty databases or failed operations with sample/in-memory data. Public group/ride reads explicitly select only public entries. Legacy ride mutations now require an active super administrator until proper rider ownership authorization is implemented; the existing unauthenticated write behaviour was unsafe. This restriction needs to be accounted for before enabling rider-side writes.

## Verification and remaining release blockers

- Backend and ERP production builds pass; isolated permission, validation, state enforcement, directory failure and HTTP-controller integration tests pass.
- HTTP integration uses database fixtures. It validates routes/provider wiring and does not establish live database correctness.
- Live schema validation currently reports BLOCKED: no backend secret configured. The secret must come from the project owner; code cannot manufacture it.
- Migration 008 and its rollback-only SQL smoke test remain to be run and verified in Supabase.
- Browser layout, keyboard/device checks at 360/390/430 and desktop remain pending because preview access was previously denied; no workaround was used.
- Catalogue/membership reads retain finite limits (1,000 for config/membership and 100 for subscription/audit listings); larger datasets need pagination before those lists can be called exhaustive.
- Rider-side authenticated CRUD, granular administrator roles, full audit coverage for legacy user/group/ride write endpoints, user provisioning UI, subscription billing/entitlement enforcement, and mobile/website feature-status consumption are not complete. Those are platform release blockers when included in launch scope.

Decision: admin code is improved and locally testable; the complete platform is NOT yet certified ready to deploy. No hosted deployment or live database changes were performed.
