# tessera-registry

<!--
  QUESTION: one sentence. What is this, and who is it for?
  Pull straight from P0 Registry.md's "Business problem" framing, compressed to a single line.
  e.g. "A foundational identity registry: one record per person, never reassigned, every change audited."
-->

<!--
  QUESTION: do you have a screenshot, GIF, or a Swagger UI capture to drop in docs/demo.<png|gif>?
  The README pattern says a visual above the fold roughly doubles how long people stay —
  cheapest win available. A screenshot of /api (Swagger) with a couple of expanded endpoints
  is a completely legitimate "demo" for an API-only project; it doesn't need to be a GIF.
-->
![demo](docs/demo.png)

## The problem

<!--
  QUESTION: 2-3 sentences, business framing, zero technology named.
  You already wrote this almost verbatim in P0 Registry.md under "Business problem (the
  README's opening paragraph)" — it's the citizen-dispute framing. Reuse it, don't rewrite it.
  Pattern note: "a reader who knows nothing about the domain should understand why someone
  would pay for this." Resist the urge to mention NestJS/Prisma/Postgres here — that's Section 10.
-->

## Quickstart

```bash
docker compose up -d
pnpm install
pnpm exec prisma migrate deploy
./scripts/seed.sh        # optional — fills the database with 100 synthetic people
pnpm start:dev
```

API docs: **http://localhost:5000/api** (Swagger UI)
Importable collection: http://localhost:5000/api-json

<!--
  QUESTION: anything else a reader needs right after quickstart? e.g. a sample curl against
  POST /persons, or "there's no seeded login because P0 has no auth yet" — one line is enough.
  Before you push: clone this into a genuinely fresh directory and run exactly these commands.
  If it doesn't work on a clean clone, nothing else in the file gets believed.
-->

## What it does

<!--
  QUESTION: 5-8 bullets, phrased as outcomes/capabilities, not a mechanical endpoint list.
  ("Looks up a person without ever exposing their national ID in a URL" reads better than
  "GET /persons/:id".) The endpoint table below is the literal reference — this section is
  the pitch. Draw from what each endpoint actually *means*:
    - registers a person with a generated, Verhoeff-checked national ID
    - looks a person up by internal id, never by national ID
    - corrects a person's details and records exactly what changed, and why
    - deactivates a person without ever deleting their record
    - full, paged change history for any person — oldest first
    - a cursor-paginated list of everyone registered, safe to walk even while people
      are being registered concurrently
    - one seed command to make a fresh clone worth looking at
-->

| Method  | Path                      | Notes                                                        |
| ------- | ------------------------- | --------------------------------------------------------------- |
| `POST`  | `/persons`                | Create. Generates `nationalId`. Writes a `created` audit entry. |
| `GET`   | `/persons`                | Cursor-paginated list.                                           |
| `GET`   | `/persons/:id`            | Fetch one. 404 via the standard error envelope.                 |
| `PATCH` | `/persons/:id`            | Partial update. Diffs old vs new, writes an `updated` entry.    |
| `POST`  | `/persons/:id/deactivate` | Not a DELETE. Requires a `reason`.                              |
| `GET`   | `/persons/:id/audit`      | Cursor-paginated change history, oldest first.                  |
| `GET`   | `/health`                 | Liveness + database connectivity.                                |

## How it works

<!--
  QUESTION: a diagram (ASCII is fine) plus 2-3 sentences on the flow. Candidates worth drawing:
    (a) the request path for PATCH /persons/:id — DTO validation -> service diffs old vs new
        -> single transaction writes the Person row AND the audit row together
    (b) AuditService injected into PersonsService — this is the one NestJS DI story the whole
        project exists to tell (P0 Registry.md says so directly: "the single most important
        thing in this project"). A small box diagram of PersonsController -> PersonsService ->
        {PrismaService, AuditService} might be the single highest-value picture in this file.
-->

## Design decisions

<!--
  QUESTION: 2-4 entries, each: decision, why, and WHAT IT COST. A decision with no downside
  listed reads as a decision you didn't actually make — that line from the README pattern is
  worth re-reading before you write these.

  Material already sitting in 01 — Decisions Log.md, just needs compressing to 2 lines each:

  1. Verhoeff check digit over a naive sum (2026-10-07 entry — lots of material here: random
     not sequential, crypto-random not Math.random, no embedded meaning, 12 digits matching
     Aadhaar). Cost: one more digit to type/misread than a shorter scheme.

  2. Deactivate, never delete (P0 Registry.md's design rules + the 2026-11-06 "409 not 400"
     entry). Cost: every query has to filter on status; the table only ever grows.

  3. Audit row written inside the same transaction as the person row (visible in
     registerPerson/updatePerson/deactivatePerson — Prisma $transaction wrapping both writes).
     Cost: worth naming honestly — what does coupling the audit write to the person write cost
     you? (e.g. a slower transaction, a harder-to-extract audit log later, audit failures now
     block the person write entirely — look at persons-audit-fails.e2e-spec.ts, that test exists
     for exactly this reason)

  4. Cursor pagination over page numbers (EMM-13, and the "registering someone part-way through
     the walk doesn't shift or duplicate" test you wrote proves this one). NOTE: this decision
     isn't in the Decisions Log yet — worth a quick entry there first, this is genuinely a good
     interview story and the Log says a good one belongs there.

  Pick 2-4, not all of them. The pattern explicitly says this section is "the whole game" —
  it's the one thing in this README that can't be copied from a tutorial.
-->

## Scope

<!--
  QUESTION: what's built, and — more importantly — what did you deliberately leave out, and why?
  P0 Registry.md already states this almost word for word under "Scope":
    Built: persons CRUD, ID generation with check digit, immutable audit log, Swagger docs,
    validation, error envelopes, tests, docker-compose.
    Deliberately not built: authentication, biometrics, file uploads, AI, queues, a frontend,
    deployment — each belongs to a later layer (P1-P3) of the stack.
  Also worth a line: the audit actor is always "system" right now because P0 has no login
  (2026-10-29 decision) — that's a scope statement, not a bug.
-->

## Testing

```bash
pnpm test          # unit
pnpm test:e2e       # integration, needs Docker (real Postgres)
pnpm test:cov       # coverage report
```

<!--
  QUESTION: state the real number. Last measured: 98% statements / 100% functions via the
  e2e suite (`pnpm test:e2e --coverage`), comfortably over the >70% bar. Also worth one honest
  line on what's NOT covered — the unit-only run (`pnpm test:cov`) is much lower because most
  behavior is proven at the e2e layer instead; say that plainly rather than leaving the reader
  to wonder why the two numbers differ.
-->

## Stack

| | |
|---|---|
| Framework | NestJS 12 (ESM-first) |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 |
| Validation | class-validator / class-transformer |
| API docs | Swagger / OpenAPI |
| Testing | Vitest (unit + e2e), Testcontainers for a real database in CI |

<!--
  Before you push (from the README pattern, don't skip this):
  - [ ] Clone into a genuinely fresh directory and follow your own quickstart. It will fail
        the first time. Fix it.
  - [ ] First screen answers: what is this, why does it exist, does it work?
  - [ ] Every claim is true TODAY, present tense — no "will support" for things not built
  - [ ] At least one visual above the fold
  - [ ] Design decisions section names the actual costs, not just the choices
  - [ ] Read it out loud — the sentences you stumble on are the ones to cut
  - [ ] 60-120 lines total once the comments above are gone. This file is intentionally
        longer right now because of these prompts — cut hard.
-->
