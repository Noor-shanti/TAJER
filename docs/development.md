# Development Environment Setup

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 20 | https://nodejs.org |
| npm | >= 10 | Included with Node.js |
| Git | Latest | https://git-scm.com |
| Turso CLI | Latest | `curl -sSfL https://get.tur.so/install.sh | bash` |
| Wrangler CLI | Latest | `npm install -g wrangler` |

## Initial Setup

```bash
# 1. Clone the repository
git clone <repo-url> merchant-sales-app
cd merchant-sales-app

# 2. Install all workspace dependencies
npm install
```

## API (Cloudflare Worker) Setup

```bash
cd apps/api

# Copy environment template
cp .env.example .dev.vars

# Edit .dev.vars with your dev Turso credentials
# TURSO_DATABASE_URL=libsql://your-dev-db.turso.io
# TURSO_AUTH_TOKEN=your-dev-token
# JWT_SECRET=your-dev-secret-min-32-chars

# Start dev server
npm run dev
# API available at: http://localhost:8787
```

## Mobile Setup

```bash
cd apps/mobile

# Copy environment template
cp .env.example .env.development

# Edit .env.development
# EXPO_PUBLIC_API_URL=http://localhost:8787/api/v1

# Start Expo dev server
npm run start

# For Android:
npm run android

# For iOS (Mac only):
npm run ios
```

## Turso Dev Database Setup

```bash
# Login to Turso
turso auth login

# Create a development database
turso db create merchant-sales-dev

# Get connection details
turso db show merchant-sales-dev
# Copy URL and token to apps/api/.dev.vars

# Run migrations
cd apps/api
npm run db:migrate
```

## Environment Variables

### apps/api/.dev.vars (NEVER COMMIT)
```
TURSO_DATABASE_URL=libsql://merchant-sales-dev-<username>.turso.io
TURSO_AUTH_TOKEN=eyJ...
JWT_SECRET=dev-secret-at-least-32-characters-long
JWT_REFRESH_SECRET=dev-refresh-secret-at-least-32-chars
NODE_ENV=development
```

### apps/mobile/.env.development (NEVER COMMIT)
```
EXPO_PUBLIC_API_URL=http://localhost:8787/api/v1
```

## Verification

```bash
# Check API is running
curl http://localhost:8787/api/v1/health
# Expected: {"success":true,"data":{"status":"ok"}}

# Check TypeScript across all workspaces
npm run typecheck

# Check linting
npm run lint

# Check formatting
npm run format:check
```
