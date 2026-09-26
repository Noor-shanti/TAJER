# Merchant Sales App — Arabic Mobile Sales Management

تطبيق موبايل عربي لإدارة المبيعات والفواتير والزبائن لتاجر واحد.

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo, TypeScript, Expo Router |
| Backend | Cloudflare Workers, Hono, TypeScript |
| Database | Turso (libSQL / SQLite) |
| Validation | Zod |
| Mobile State | TanStack Query, React Hook Form |
| Auth Storage | Expo SecureStore |

## Repository Structure

```
merchant-sales-app/
├── apps/
│   ├── mobile/     → Expo React Native application
│   └── api/        → Cloudflare Workers + Hono REST API
├── packages/
│   └── shared/     → Shared TypeScript types, enums, constants
├── docs/           → Documentation
└── .github/        → CI/CD workflows
```

## Prerequisites

- Node.js >= 20
- npm >= 10
- Git
- Cloudflare account
- Turso account
- Expo account (for EAS Build)

## Quick Start (Development)

See [docs/development.md](docs/development.md) for full setup instructions.

```bash
# Install all workspace dependencies
npm install

# Start the API (Cloudflare Worker dev server)
npm run api

# Start the mobile app (Expo)
npm run mobile
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design and decisions |
| [Database](docs/database.md) | Schema, migrations, money strategy |
| [API](docs/api.md) | REST endpoint reference |
| [Development](docs/development.md) | Local setup guide |
| [Deployment](docs/deployment.md) | Production deployment |
| [Backup & Restore](docs/backup-and-restore.md) | Data backup strategy |
