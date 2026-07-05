# Bill Matrix — Architecture & Folder Conventions

This document defines where code lives in this project. Every future feature should fit one of the categories below without needing a new top-level folder. If you're an AI coding agent working on a future phase, follow this document — don't invent a new convention.

## Core principle: Server Actions first, Route Handlers only for true external HTTP

This app uses Next.js Server Actions as the default way pages talk to the backend (form submissions, button clicks, data mutations). A Route Handler (`app/api/.../route.ts`) is only created when something outside a browser session needs to hit an HTTP endpoint directly — for example, a webhook from Resend or a future payment provider. If you're unsure which to use: if a logged-in user triggers it from the UI, it's a Server Action in `lib/actions/`. If an external service calls it, it's a Route Handler in `app/api/`.

## Folder reference

| Folder | Purpose | Introduced in |
|---|---|---|
| `app/(marketing)`, `app/(auth)`, `app/(app)`, `app/(admin)` | Page routes, grouped by access level. Not modified by backend phases except to wire in real data. | Existing (v0) |
| `app/api/` | Route Handlers for true external HTTP endpoints only (webhooks, health checks). Rare — most things are Server Actions instead. | Phase 1 (empty), used starting Phase 16+ |
| `lib/db/` | Drizzle ORM schema (`lib/db/schema/`) and the database client. The single source of truth for the data model. | Phase 2 |
| `lib/auth/` | Neon Auth / Better Auth setup and session helpers. | Phase 3 |
| `lib/actions/` | Server Actions, grouped into one subfolder per business domain (`customers/`, `products/`, `invoices/`, `credit-notes/`, `payments/`, `reports/`, `business/`). Each domain folder contains the create/read/update actions for that domain. `_shared/` holds the common wrapper every action uses for validation and error handling — see Phase 4. | Phase 4 (`_shared`), then per domain in later phases |
| `lib/validations/` | Zod schemas that validate input before it reaches a Server Action. One file per domain, matching `lib/actions/`. | Phase 5 onward |
| `lib/gst/` | The GST tax calculation engine — pure functions only, no database or UI code. This is the most important folder in the app for correctness; keep it isolated and testable. | Phase 8 |
| `lib/invoices/` | Invoice-numbering logic (financial-year-aware sequencing). Kept separate from `lib/actions/invoices/` because numbering is a pure rule, not a database action. | Phase 9 |
| `lib/pdf/` | Invoice/credit-note PDF template and generation logic. | Phase 10 |
| `lib/storage/` | iDrive e2 (S3-compatible) client for archiving finalized invoice PDFs. | Phase 11 |
| `lib/excel/` | ExcelJS-based export logic for the monthly ITR/GST export. | Phase 15 |
| `lib/email/` | Resend client (`lib/email/`) and email templates (`lib/email/templates/`). | Phase 16 |
| `lib/rate-limit/` | Upstash Redis-based rate limiting, applied to sensitive Server Actions. | Phase 17 |
| `types/` | Shared TypeScript types used across more than one domain (e.g., a shared `Money` or `TaxBreakdown` type). Domain-specific types that are only used within one folder can stay local to that folder instead. | Phase 2 onward |
| `components/` | UI components (existing, from v0). Not restructured by backend phases. | Existing (v0) |

## Naming conventions

- Files: kebab-case (`invoice-numbering.ts`, not `invoiceNumbering.ts`)
- Functions and variables: camelCase
- Types and React components: PascalCase
- Each domain's Server Actions file is named after the action it performs where possible (e.g., `lib/actions/customers/create-customer.ts`) rather than one giant `actions.ts` file per domain — this keeps files small and easy for an AI agent to open and edit without pulling in unrelated code.

## Decision guide — "where does my code go?"

- Is it something the user sees or clicks? → `app/` or `components/`
- Is it triggered by a user action and touches the database? → `lib/actions/{domain}/`
- Is it validating the shape of input data? → `lib/validations/`
- Is it a pure calculation with no side effects (tax math, numbering rules)? → `lib/gst/` or `lib/invoices/`
- Is it talking to an external service (storage, email, rate limiting)? → its own `lib/{service}/` folder
- Is it a type used in more than one place? → `types/`

## Why this structure

Every folder above maps to exactly one future phase in `BillMatrix_Backend_Roadmap_v1.md`. Nothing here is speculative — each folder exists because a specific, already-planned phase needs it. This means the project never needs a restructuring pass later: as each phase is implemented, its code goes into a folder that was already waiting for it.
