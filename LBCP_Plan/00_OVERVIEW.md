# 00 — Overview (Zero → Distributable)

## What you are building
A **controlled execution gateway** for Human + AI actions:

- **Controller Core (Authority):** validates every requested action and decides allow/block.
- **Adapters (Hands):** platform-specific executors (CEP, Browser, Electron, etc.).
- **UI (Face):** shows phase + solve guidance and emits intents, never executes directly.
- **Agents (Advisors):** generate proposals and guidance, never execute or save directly.

## Why this matters
- Eliminates silent failures (“nothing happened”).
- Prevents environment mismatch (CEP vs Browser) from crashing workflows.
- Ensures every action is safe, validated, and explainable.
- Makes it portable: CEP is one adapter, not the whole product.

## Core principle
> **Agents propose. Controller decides. Adapters execute. UI informs.**

## Key deliverables for distribution
- Stable CEP build (no freezes, deterministic boot)
- Script Editor correctness (typing, Prism alignment, run logic)
- Provider/vision pipelines validated (Gemini image parsing)
- User Notebook system (client/project intelligence)
- Phase badge + solve hints (self-guiding UX)
- Rollback + release gating process
