# tessera-registry

A foundational identity registry: one record per person, an identifier that is never reassigned, and a complete, immutable record of every change ever made to it.

> Layer 1 of the [Tessera](../README.md) identity stack: **who exists**.

## The problem

A national ID authority needs a registry of persons, each with a unique and never-reassigned identifier, a small set of demographic attributes, and a complete record of every change ever made to their data. Auditability is not a feature here; it is the product. When a citizen disputes their record, the authority has to be able to show exactly what changed, when, and by whom.

## Quickstart

```bash
docker compose up -d
pnpm install
pnpm exec prisma migrate deploy
./scripts/seed.sh        # optional, fills the database with 100 synthetic people
pnpm start:dev
```

API docs: **http://localhost:5000/api** (Swagger UI) · importable collection at `/api-json`

There's no login yet (see Scope): every endpoint is open, and every audit row records `actor: "system"`.

## What it does

- Registers a person with a server-generated, Verhoeff-checked national ID that's never client-supplied
- Looks a person up by their internal id, never by national ID, so the citizen's number never ends up in a URL, log, or proxy
- Corrects a person's details and records exactly what changed, from what, to what, and why
- Deactivates a person without ever deleting the row, since identifiers are never reassigned
- Writes the person row and its audit row in a single transaction, so a failed audit write rolls back the whole registration or correction rather than leaving one without the other
- Returns a person's full change history, oldest first, paged so a long-lived record never returns its entire history at once
- Lists everyone registered, cursor-paginated so the walk stays correct even while people are being registered concurrently
- One seed command fills a fresh clone with 100 valid, audited people to look at

| Method  | Path                      | Notes                                                           |
| ------- | ------------------------- | ---------------------------------------------------------------- |
| `POST`  | `/persons`                | Create. Generates `nationalId`. Writes a `created` audit entry.  |
| `GET`   | `/persons`                | Cursor-paginated list.                                            |
| `GET`   | `/persons/:id`            | Fetch one. 404 via the standard error envelope.                  |
| `PATCH` | `/persons/:id`            | Partial update. Diffs old vs new, writes an `updated` entry.     |
| `POST`  | `/persons/:id/deactivate` | Not a DELETE. Requires a `reason`.                                |
| `GET`   | `/persons/:id/audit`      | Cursor-paginated change history, oldest first.                   |
| `GET`   | `/health`                 | Liveness + database connectivity.                                 |

## How it works

```
PersonsController
      │  delegates, does no logic of its own
      ▼
PersonsService ──────┬──────────────► PrismaService (Postgres)
  diffs old vs new    │
  builds the audit     ▼
  entry shape        AuditService ───► writes the audit row
      │
      ▼
   one Prisma $transaction: the person row and its audit row
   commit together, or neither does
```

`AuditService` is injected into `PersonsService` rather than called statically: the controller never touches it directly, and `PersonsService` never knows how an audit row is actually written, only that it can ask for one. That seam is what makes `persons-audit-fails.e2e-spec.ts` possible: it swaps in a fake `AuditService` that throws, with zero changes to `PersonsService` itself, and proves a failed audit write rolls the whole registration back rather than silently losing the trail.

Every mutation (`POST /persons`, `PATCH /persons/:id`, `POST /persons/:id/deactivate`) runs inside one `prisma.$transaction`: the person row and its audit row are written together, and either both commit or neither does. There is no window where a person exists with no `created` row behind them, or a correction is saved with no record of what changed.

## Design decisions

**Verhoeff check digit over a naive sum.** Real ID systems append a check digit so typos are caught before they become database corruption. Verhoeff catches every single-digit error and every adjacent transposition, which a mod-10 sum does not. Cost: one more digit to generate and validate than the simpler scheme, and a less widely known algorithm to explain.

**Deactivate, never delete.** A foundational registry's core promise is that an identifier is never reassigned. Deleting a row and letting a new person take its place would break that silently. Cost: every query has to filter on `status`, the table only ever grows, and deactivating someone already inactive has to be handled as a real state (409, not a silent success) rather than ignored.

**The audit row is written inside the same transaction as the person row.** A person can't exist without their `created` entry, and a correction can't be saved without its `updated` entry. The audit trail is never allowed to drift from what actually happened. Cost: an audit-store failure now fails the entire registration or update, not just the logging; a slower or unavailable audit write blocks the person write too.

**Cursor pagination, not page numbers, on the list and history endpoints.** A page-number API's position is relative to the current table, so a row inserted mid-walk shifts every later page down by one: the reader sees a row twice and silently misses another. A cursor anchors to a specific row, so a concurrent insert can't move it. Cost: no jumping to "page 7", and no total count without a separate query.

## Scope

**Built:** persons CRUD, server-generated national ID with a check digit, an immutable audit log, cursor-paginated list and history endpoints, Swagger docs, request validation, consistent error envelopes, a seed script, and both unit and e2e tests.

**Deliberately not built, all belonging to a later layer of the stack:** authentication (the audit actor is always `"system"` for now; a real principal arrives with P2's login), biometrics, file uploads, AI, queues, a frontend, deployment. Adding any of them here is how a "foundational registry" quietly becomes a three-month project.

## Testing

```bash
pnpm test          # unit
pnpm test:e2e      # integration, needs Docker (a real Postgres)
pnpm test:cov      # coverage report
```

98% statement coverage, 100% function coverage, measured via the e2e suite (`pnpm test:e2e --coverage`). Most behavior here is proven at that layer, against a real database, rather than with mocks. The unit-only number is lower on its own; that's expected, not a gap.

## Stack

| | |
|---|---|
| Framework | NestJS 12 (ESM-first) |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 |
| Validation | class-validator / class-transformer |
| API docs | Swagger / OpenAPI |
| Testing | Vitest (unit + e2e), Testcontainers for a real database in CI |
