# Tessera

**A digital public infrastructure identity stack, built in four layers.**

Identity, verified. Consent, enforced. Benefits, delivered — auditably.

> **Status: in active development.** This is a learning-in-public build, and the status table below is honest — nothing is marked complete that isn't. Not a production system, and not affiliated with any government or standards body.

---

## The problem

The European Union has mandated that every member state offer citizens a digital identity wallet by **December 2026**, and that regulated companies — banks, telcos, large platforms — must *accept* it by **December 2027**. As of late 2026, fewer than a third of member states meet the readiness benchmark.

Meanwhile, outside the EU, platforms like [MOSIP](https://github.com/mosip) already underpin national identity for 31 countries, and [OpenG2P](https://openg2p.org) delivers social benefits on top of them.

This is a large, dated, non-optional wave of backend engineering. The protocols involved — OpenID4VCI, OpenID4VP, W3C Verifiable Credentials — are unfamiliar to most backend developers.

**Tessera is a working slice of that stack**, built to understand it properly rather than read about it.

## Why "Tessera"

A **tessera frumentaria** was a small lead or bronze token issued to eligible Roman citizens under the *annona*, the state grain distribution. It was inscribed with the holder's eligibility details, issued by an authority, renewable annually or on inheritance — and it existed specifically to prevent fraud in a public distribution serving roughly 200,000 people a month.

Issuer, credential, eligibility attributes, expiry, revocation, anti-fraud. Verifiable credentials are not a new idea; Rome issued them in bronze.

But a tessera was a **bearer instrument** — possession was the proof. Whoever held the bronze collected the grain. Rome had the credential and no way to guarantee one person held only one token.

**That gap is the hard part of this entire domain**, and it is what the deduplication engine in `tessera-disburse` exists to close.

---

## How the four layers fit together

Each layer answers exactly one question, and consumes only the layer beneath it.

```
                          ┌─────────────┐
                          │   Citizen   │
                          └──────┬──────┘
                                 │ enrols
                                 ▼
┌───────────────────────────────────────────────────────────┐
│  tessera-registry                        WHO EXISTS       │
│  Unique, never-reassigned identifier. Immutable audit.    │
└──────────────────────────┬────────────────────────────────┘
                           │ an identity to check against
                           ▼
┌───────────────────────────────────────────────────────────┐
│  tessera-verify                   PROVE WHO YOU ARE       │
│  Document extraction, face match, confidence scoring,     │
│  and a human-review queue for anything uncertain.         │
└──────────────────────────┬────────────────────────────────┘
                           │ a verified subject
                           ▼
┌───────────────────────────────────────────────────────────┐
│  tessera-consent                 CONTROL YOUR DATA        │◄──┐
│  Credential issuance (OpenID4VCI), selective disclosure,  │   │ relying
│  signed and revocable consent artifacts.                  │   │ party
└──────────────────────────┬────────────────────────────────┘   │ asks
                           │ only the consented attributes      │
                           ▼                                    │
┌───────────────────────────────────────────────────────────┐   │
│  tessera-disburse                  ACT ON IDENTITY        │───┘
│  Eligibility rules, payment batching, reconciliation,     │
│  fraud detection, grievance redressal.                    │
└───────────────────────────────────────────────────────────┘
```

The ordering is not arbitrary. You cannot meaningfully consent to sharing data about a person who has no identity, and you cannot safely send money to a beneficiary you cannot uniquely identify.

### The layers

| Layer | Answers | Status |
|---|---|---|
| **[tessera-registry](./tessera-registry)** | Who exists? | 🔴 Planned |
| **[tessera-verify](./tessera-verify)** | Are you who you claim? | 🔴 Planned |
| **[tessera-consent](./tessera-consent)** | Who may know what about you? | 🔴 Planned |
| **[tessera-disburse](./tessera-disburse)** | What are you entitled to? | 🔴 Planned |

🔴 Planned · 🟡 In progress · 🟢 Shipped

---

## Design principles

These are borrowed from how real DPI is built, and they constrain the code rather than decorate the README.

**Minimalism.** Each layer does one thing. The registry answers "does this person exist and are they unique" — it does not store benefit eligibility, medical history, or bank details. This is why these are four systems and not one application with four modules.

**Federation over centralization.** The infrastructure moves *proofs* and *permissions*, not bulk copies of databases. The consent layer brokers a time-bound pipe; it does not warehouse what flows through it.

**Consent is a first-class artifact.** Not a boolean column — a signed, revocable, auditable object carrying a subject, a scope, a *purpose*, and an expiry. Purpose limitation is the thing ordinary OAuth scopes cannot express.

**Interoperability through open standards.** W3C Verifiable Credentials and OpenID4VCI/VP rather than a bespoke token format, so anything conforming can participate.

**Exclusion is the real risk.** In commercial software a false negative is an annoyance. Here it means a person does not receive their pension. Every automated decision in this stack has a human appeal path, and it is built at the same time as the decision — not bolted on later. An AI that silently rejects people is not a feature.

---

## Stack

| | |
|---|---|
| **Framework** | NestJS (v11; `tessera-disburse` on v12) |
| **Database** | PostgreSQL + pgvector — relational and vector data in one transactional store |
| **ORM** | Prisma |
| **Queue** | BullMQ + Redis |
| **Tests** | Vitest, plus Testcontainers for integration |
| **Inference** | Hugging Face Inference Providers for text; local ONNX via `@xenova/transformers` for vision |
| **Ops** | Docker, GitHub Actions, OpenTelemetry → Prometheus → Grafana |

### On the AI

Every model sits behind an interface (`IDocumentExtractor`, `IFaceMatcher`) defined *before* any implementation exists. This is deliberate: hosted document-AI turned out to be unavailable on Hugging Face's free tier, and because the interfaces already existed, moving vision inference to local ONNX cost one provider swap rather than a rewrite.

The flagship runs entirely on local inference — no API keys required to clone and demo it.

Models used are small and purpose-specific — embeddings, classifiers, face vectors — not general-purpose LLMs. Where a statistical baseline outperforms a model, the baseline wins.

---

## Scope, honestly

The full EU Architecture Reference Framework spans 31 implementing acts, certification regimes, qualified trust service providers and secure hardware attestation. **This does not implement that**, and is not a certified wallet.

What it does implement: enough of OpenID4VCI and OpenID4VP to demonstrate the issuance and presentation model end to end, a working selective-disclosure flow, and the surrounding infrastructure — queues, consent enforcement, audit trails, deduplication, reconciliation — built to production patterns at demonstration scale.

Each layer's own README states precisely what is in and out of scope for that layer.

---

## Repository layout

A single repository, four independent services. Each has its own `package.json`, Docker setup, tests and README, and each runs standalone — the layers integrate over HTTP, not through shared code.

```
Tessera/
├── tessera-registry/     # NestJS + Prisma + Postgres
├── tessera-verify/       # + BullMQ, Redis, object storage, ONNX
├── tessera-consent/      # + OIDC provider, JOSE, W3C VCs
└── tessera-disburse/     # + NATS, sagas, pgvector, OpenTelemetry
```

## Running it

Each layer runs on its own. See the README in each directory.

```bash
cd tessera-registry
docker compose up -d      # Postgres
npm install
npm run start:dev         # API docs at http://localhost:3000/api
```

---

## Background reading

If this domain is new to you, these are the things worth knowing before the code makes sense:

- [MOSIP](https://github.com/mosip) — the reference modular identity platform
- [OpenG2P](https://openg2p.org) — benefit disbursement on top of foundational identity
- [Regulation (EU) 2024/1183](https://eur-lex.europa.eu/eli/reg/2024/1183/oj) — eIDAS 2.0, the wallet mandate
- [OpenID for Verifiable Credential Issuance](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model-2.0/)
- [Centre for Digital Public Infrastructure](https://cdpi.dev) — the conceptual framing

---

## Author

Built by [Shoetan](https://github.com/Shoetan) — a frontend engineer learning backend architecture by building something that isn't a todo app.

Notes on decisions and trade-offs are kept as the work happens, not reconstructed afterwards. Ask me about the false-accept/false-reject threshold in the deduplication engine; there is no correct answer to it, which is what makes it interesting.
