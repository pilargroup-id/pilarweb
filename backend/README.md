# Webpilar Backend

Express backend for the Webpilar internal goods-request application.

## Setup

```bash
cp .env.example .env.local
npm install
npm run check
npm run dev
```

Production uses `.env` because the configuration loader selects `.env` when `NODE_ENV=production`.

## Important integration rule

Webpilar consumes only:

```http
GET /api/item/items
```

from Itembase. The Webpilar backend always adds:

```text
item_kind=regular
```

A client-provided `item_kind` is ignored.

## Database

All SQL files are under `backend/database/` only.

- `database/migrations/` contains ordered schema changes.
- `database/schema/webpilar-schema.sql` is a consolidated fresh-install schema.
- `database/seeds/` contains ordered baseline data.

No foreign-key constraints are used. Central PilarGroup and Itembase references are stored as IDs plus transaction snapshots where applicable.
