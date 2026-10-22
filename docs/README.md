# Compressly: Docs Index

| Doc | What it answers | Update when |
| --- | --- | --- |
| [Compressly — Detailed Project Report.md](Compressly%20—%20Detailed%20Project%20Report.md) | The original business plan (DPR). Team and budget sections superseded by BUDGET_AND_RESOURCES.md; local DB choice superseded by TECH_STACK.md §1 | Never (reference) |
| [PRD.md](PRD.md) | What we're building, for whom, priorities, release criteria | Scope changes |
| [SRS.md](SRS.md) | Testable functional and non-functional requirements (FR / NFR ids) | Requirement added or changed |
| [DESIGN.md](DESIGN.md) | UX flow, screens, copy tone, design tokens, presets in plain words; daily feature notes (§12) | Every design decision |
| [TECH_STACK.md](TECH_STACK.md) | Languages, packages, native libraries, versions, and why | Before adding any package or library |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Layers, folders, Pigeon contract, job state machine, data model, safety design | Structural changes |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Phase-wise build plan, session by session | Daily (tick boxes) |
| [PROJECT_PLAN.md](PROJECT_PLAN.md) | Schedule, milestones, gates, KPIs, status log | Weekly |
| [RISK_REGISTER.md](RISK_REGISTER.md) | Risks, scores, mitigations, legal and store checklist | Weekly and at gates |
| [BUDGET_AND_RESOURCES.md](BUDGET_AND_RESOURCES.md) + [CSV](budget_and_resources.csv) | Costs, spend plan, break-even, people, devices, size budget | Any spend > ₹500 |

## Key decisions (22 Oct 2026)

1. **Team model:** Vedant (founder, product owner, designer, tester) + Claude Code as the builder, the same model as Doodle Rage. The DPR's hired team (₹12.19 lakh) is kept as Plan B in BUDGET_AND_RESOURCES.md §6.
2. **One engine database:** the native Room database is the single source of truth for media items, jobs, results and engine settings, because background jobs run without a Flutter engine. Flutter reads it through Pigeon. The DPR's Drift layer is dropped (TECH_STACK.md §1).
3. **Studio:** published under Connected Interactive. Package id `com.connectedinteractive.compressly`.
4. **Android first.** iOS is not touched until the iOS go/no-go gate (Mon 22 Feb 2027).

## The one rule above all others

**Never lose an original.** Any change that touches encoding, saving or deleting media must keep the guarantees in ARCHITECTURE.md §7, and the safety suite must pass (RISK_REGISTER R1).
