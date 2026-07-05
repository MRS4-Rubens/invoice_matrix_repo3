# Bill Matrix

A GST billing and invoicing web application for Indian small businesses.

## Prerequisites

- **Node.js** — version pinned in `.nvmrc`. If you have [nvm](https://github.com/nvm-sh/nvm) installed, run `nvm use` to switch to the correct version automatically.
- **pnpm** — this repo enforces pnpm as the only package manager. Do not use npm or yarn.

## Getting Started

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd BM_TS_v2.0.1C
   ```

2. Switch to the correct Node version (if using nvm):
   ```bash
   nvm use
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Copy `.env.example` to `.env.local` and fill in the required values:
   ```bash
   cp .env.example .env.local
   ```

5. Start the local development server:
   ```bash
   pnpm dev
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `pnpm dev` | Starts the Next.js development server with hot reload. |
| `build` | `pnpm build` | Creates an optimised production build. |
| `start` | `pnpm start` | Serves the production build locally. |
| `lint` | `pnpm lint` | Runs ESLint to check for code quality issues. |
| `typecheck` | `pnpm typecheck` | Runs the TypeScript compiler in no-emit mode to check for type errors. |

## Project Status

This project is being built in phases according to a documented backend roadmap. See `BillMatrix_Backend_Roadmap_v1.md` for current progress and what's implemented so far.
