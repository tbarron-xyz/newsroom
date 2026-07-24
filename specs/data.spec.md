# attonews Data Storage Strategy

This directory contains backend-specific storage specifications:

- [data.redis.spec.md](data.redis.spec.md) — Redis
- [data.mongo.spec.md](data.mongo.spec.md) — MongoDB

## Migration Note (SQLite & PostgreSQL)

Neither the SQLite nor the PostgreSQL backend uses a migration framework.

- **SQLite** auto-creates all tables at startup via `CREATE TABLE IF NOT EXISTS`.
- **PostgreSQL** assumes the schema is already set up (or will be created at startup when wired).

Schema changes must be applied by editing the `createTables()` method directly or by running the standalone script at `src/scripts/create-postgres-schema.ts`.
