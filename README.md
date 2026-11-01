# MotoSync Backend (NestJS API)

Independent NestJS API backend for the MotoSync platform. Connects to Supabase (or any PostgreSQL database) and exposes RESTful endpoints for the rider app and admin ERP.

## Features
- **REST API** with global prefix `/api/v1`
- **Supabase Integration** - Works with existing Supabase database and RLS policies
- **Modular Architecture** - Plans, Flags, Sounds, Campaigns, Users, Rides, Clubs, Admin modules
- **Admin ERP Endpoints** - Full CRUD for platform configuration
- **Health Check** - `/api/v1/health`
- **Production Ready** - Helmet, CORS, compression, validation pipes

## Quick Start

```bash
npm install
npm run start:dev
```

The API will be available at `http://localhost:4000/api/v1`

## Environment Variables
Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=4000
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
SUPABASE_URL=https://hxsifqmspboitoqnkvwj.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (optional, for admin operations)
```

## API Endpoints

### Public
- `GET /api/v1/health` - Health check
- `GET /api/v1/plans` - Active subscription plans
- `GET /api/v1/flags` - Feature flags
- `GET /api/v1/sounds` - Active exhaust sounds
- `GET /api/v1/campaigns` - Active sponsored campaigns
- `GET /api/v1/rides` - Rides feed
- `GET /api/v1/clubs` - Clubs directory
- `GET /api/v1/users` - Users (limited)

### Admin (use service role or authenticated with super_admin)
- `GET /api/v1/admin/users` - All users
- `PUT /api/v1/admin/users/:id` - Update user
- `GET /api/v1/admin/audit` - Audit log
- `POST /api/v1/admin/audit` - Log action
- `GET /api/v1/plans/admin` - All plans (including inactive)
- `POST /api/v1/plans` - Create/update plan
- `DELETE /api/v1/plans/:id` - Delete plan
- `GET /api/v1/flags/admin` - All flags
- `POST /api/v1/flags` - Upsert flag
- `DELETE /api/v1/flags/:key` - Delete flag
- `GET /api/v1/sounds/admin` - All sounds
- `POST /api/v1/sounds` - Upsert sound
- `DELETE /api/v1/sounds/:id` - Delete sound
- `GET /api/v1/campaigns/admin` - All campaigns
- `POST /api/v1/campaigns` - Upsert campaign
- `DELETE /api/v1/campaigns/:id` - Delete campaign

## Deployment
- **Railway/Render/Fly.io**: Use the included `Dockerfile`
- **Vercel/Heroku**: Build with `npm run build`, start with `npm run start:prod`
- **Environment**: Set all env vars in your hosting provider

## Database
This backend works with your existing Supabase database. Migrations are stored in `supabase/migrations/` for reference. All RLS policies remain enforced.
