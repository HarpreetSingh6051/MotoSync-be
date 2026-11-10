# MotoSync Backend API Gateway

Independent NestJS REST API backend for the MotoSync platform (**Pack Connected. Ride in Sync**). Serves as the authoritative write gateway, Supabase service-role mediator, and audit logger.

## Tech Stack & Architecture
- **Framework**: NestJS 10, Express, TypeScript, Node.js 20
- **Database & Auth**: Supabase PostgreSQL + Supabase Auth JWT verification
- **Validation**: `class-validator`, `class-transformer` DTO validation pipes
- **Security**: Helmet, CORS origin restriction, Throttler rate limiting
- **Docker**: Multi-stage production Dockerfile with built-in healthcheck

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start development server with hot-reload (port 4000)
npm run start:dev

# 3. Production build & start
npm run build
npm run start:prod   # Runs node dist/src/main
```

The API runs at `http://localhost:4000/api/v1` (with healthcheck at `/api/v1/health`).

## Environment Variables
Configure in `.env`:
```env
NODE_ENV=development
PORT=4000
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:8081,http://localhost:3000,http://localhost:5174
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

## Docker Deployment
```bash
docker build -t motosync-backend .
docker run -p 4000:4000 --env-file .env motosync-backend
```
