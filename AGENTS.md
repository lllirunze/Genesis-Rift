# Repository Guidelines

## Project Structure & Module Organization

This repository is an npm workspace monorepo written in TypeScript.

- `apps/web`: React/Vite client. Feature UI lives in `src/features`; static assets belong under `public/assets`.
- `apps/server`: Node.js server, logging, sessions, rooms, and transport adapters.
- `packages/game-core`: framework-independent game rules. Organize code by domain under `src/systems` (for example, `map`, `inventory`, and `random`).
- `packages/game-data`: configurable identities, items, terrain, statuses, and other static game data.
- `packages/shared`: protocol contracts, shared types, and cross-package configuration.
- `docs`: authoritative design and coding specifications. Update relevant documents when rules change.

Keep definitions, runtime state, configuration, and execution logic separate. Core rules must not depend on React, server transports, or filesystem APIs.

## Context Efficiency

This project uses a lightweight Codex context system under `docs/codex/`. Context efficiency and token usage are important.

For normal development, do not recursively scan or read the entire repository. Start with the smallest sufficient context: read `docs/codex/PROJECT_CONTEXT.md` and `docs/codex/MODULE_INDEX.md` when the task location is not already clear; then read only the relevant `docs/codex/modules/*.md`, target source files, and direct dependencies. For a small task with a known file path, read that file directly instead of mechanically loading every context document.

Preferred workflow: task → context/index → target module note → target files → direct dependencies → implementation. Expand to another module only for an actual code or business dependency. Prefer searches by filename, symbol, import, reference, or module path. Do not open files "just in case".

A source file should normally be opened only when it may be changed, defines a directly used symbol, contains a required business rule, or the lightweight context is insufficient. Do not scan `node_modules`, `.git`, `dist`, `build`, `coverage`, `logs`, generated output, lock files, or static media unless the task explicitly concerns them.

Maintain this context incrementally: implementation-only changes need no update; business-rule or core-file changes update the relevant module note; module/path changes update `MODULE_INDEX.md`; architecture or stack changes update `ARCHITECTURE.md` or `PROJECT_CONTEXT.md`. Keep these files navigational, not copies of source code or game-design documents.

## Build, Test, and Development Commands

- `npm install`: install all workspace dependencies. Requires Node 24+ and npm 11+.
- `npm run dev:web`: start the Vite web client.
- `npm run dev:server`: start the local Node.js server.
- `npm test`: run all Vitest suites once.
- `npm run typecheck`: type-check every workspace.
- `npm run build`: type-check and build the web application.
- `npm run format` / `npm run format:check`: apply or verify Prettier formatting.

Before submitting changes, run `npm test`, `npm run typecheck`, and `npm run format:check`.

## Coding Style & Naming Conventions

Use two-space indentation and Prettier defaults. Files and directories use `kebab-case`; functions and variables use `camelCase`; types and classes use `PascalCase`; module constants use `UPPER_SNAKE_CASE`. Static resource IDs use `<type>_<6 digits>`, such as `equip_000001`; never encode names, quality, or subtypes in IDs.

Write code comments and TSDoc in Chinese. Public methods should document method name, purpose, parameters, return value, and relevant errors. Never place comments after code on the same line. Avoid direct `console.log` and `Math.random`; use the project logging and random systems.

## Testing Guidelines

Vitest tests are colocated with implementation files and named `*.test.ts`. Cover successful behavior, boundaries, invalid input, and deterministic outcomes. Configuration additions should include validation tests. Do not rely on real time or unseeded randomness.

## Commit & Pull Request Guidelines

Use Conventional Commit-style subjects seen in history, such as `feat(map): implement vision calculation` or `refactor: separate configuration definitions`. Keep commits focused. Pull requests should explain behavior changes, list affected docs/configuration, report test commands, link relevant issues, and include screenshots for visible UI changes. Do not commit `logs/`, build output, or unrelated generated files.
