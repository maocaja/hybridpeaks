<!--
Sync Impact Report:
Version: 1.0.0 → 1.1.0
Change Type: MINOR
Modified Principles: None
Added Sections:
  - Engineering Quality Guardrails (principles 21-26)
  - Enforcement & Quality Gates
Removed Sections: None
Templates Impact: Recommend adding quality guardrail reminders in tasks-template.md (not edited now)
Follow-up TODOs: Consider updating tasks-template to reference guardrails 21-26
-->

# HybridPeaks Project Constitution

**Version:** 1.1.0  
**Ratification Date:** 2025-12-28  
**Last Amended:** 2025-12-29

---

## Preamble

This constitution establishes the governing principles for **HybridPeaks**, a training platform designed for hybrid athletes who pursue excellence in both strength and endurance domains. These principles guide all product, design, engineering, and operational decisions to ensure the platform serves athletes effectively while remaining maintainable and evolvable.

---

## Product Principles

### 1. Clarity Over Features

**The platform prioritizes clear, focused functionality over feature abundance.** Every capability must have a clear purpose aligned with hybrid athlete needs. Features that complicate the core experience or create confusion are rejected, even if technically impressive.

*Rationale:* Athletes need tools that enhance training, not distract from it. Cognitive load during training should be minimized.

### 2. Execution-First Mindset

**Shipping working software takes precedence over perfect planning.** The team builds, tests with real users, and iterates based on actual usage patterns rather than theoretical requirements.

*Rationale:* Hybrid training is a rapidly evolving domain. Real-world feedback reveals needs that cannot be anticipated through planning alone.

### 3. Progressive Disclosure

**Advanced capabilities are hidden until needed.** The default interface serves athletes starting their hybrid journey; complexity surfaces only when the athlete's training sophistication demands it.

*Rationale:* The platform must serve both beginners building base fitness and advanced athletes managing complex periodization.

### 4. Data in Service of Performance

**All metrics and data collection must directly support training decisions.** Data that cannot be acted upon is noise. Every metric must include a clear explanation of why it matters and how an athlete can act on it.

*Rationale:* Data overload leads to analysis paralysis. Athletes need actionable insights, not vanity metrics.

### 5. Respect for Training Time

**Every interaction must be optimized for speed and minimal disruption.** The platform never interrupts a training session with non-critical information or requires multi-step flows when one will suffice.

*Rationale:* Training time is sacred. Interface friction directly degrades the athlete experience.

---

## Domain Principles

### 6. Strength and Endurance Are Complementary

**The platform treats strength and endurance as integrated components of a unified training system, not competing priorities.** Programming guidance accounts for interference effects and recovery demands across both domains.

*Rationale:* Hybrid training is not simply adding running to strength training. It requires understanding of how adaptations interact and conflict.

### 7. Progressive Overload Across Modalities

**Training loads must progress systematically in both strength and endurance domains while managing total stress.** The platform tracks volume, intensity, and frequency across all modalities to prevent under- or over-training.

*Rationale:* Hybrid athletes face unique recovery challenges. Uncoordinated progression in one domain can stall progress in another.

### 8. Individual Response Variability

**Training recommendations acknowledge that athletes respond differently to identical stimuli.** The platform supports personalization based on observed response, not just prescriptive templates.

*Rationale:* Genetic factors, training history, lifestyle stress, and recovery capacity vary widely. Cookie-cutter programs fail most athletes.

### 9. Context-Dependent Programming

**Training decisions must account for the athlete's current life context, not just physiological readiness.** Work stress, sleep quality, travel, and life events are legitimate inputs to training adjustments.

*Rationale:* Athletes are not laboratory subjects. Real-world constraints matter more than perfect programming.

---

## UX Principles

### 10. Mobile-First, Always

**Every interaction is designed for mobile devices first, then adapted for larger screens.** The platform assumes athletes interact during or immediately around training sessions when phones are the primary device.

*Rationale:* Athletes train in gyms, outdoors, and on the go. Desktop-first design creates friction where it matters most.

### 11. Default to Today

**The interface surfaces today's training and today's status by default.** Historical data and future plans require intentional navigation.

*Rationale:* The most common question is "What should I do today?" Answer that immediately.

### 12. Input Minimization

**The platform infers or pre-fills every possible field.** Athletes should only input information that cannot be automatically determined or reasonably defaulted.

*Rationale:* Manual data entry during training is tedious and error-prone. Reduce it to the absolute minimum.

### 13. Offline-First Reliability

**Core training functionality must work without internet connectivity.** Sync happens in the background when connectivity is available.

*Rationale:* Athletes train in basements, remote trails, and areas with poor connectivity. The platform cannot depend on constant internet access.

---

## Engineering Principles

### 14. Simplicity as a Feature

**The simplest solution that meets requirements is the correct solution.** Complexity is a liability that must be justified by proportional value.

*Rationale:* Complex systems are harder to maintain, extend, and debug. Simplicity enables faster iteration and more reliable operation.

### 15. Evolvability Over Premature Optimization

**Code structure prioritizes ease of change over theoretical performance gains.** Optimize only when actual performance problems are measured and impact users.

*Rationale:* Requirements for hybrid training platforms are still emerging. The ability to adapt quickly is more valuable than premature optimization.

### 16. Explicit Over Implicit

**System behavior must be obvious from reading the code.** Magic, hidden abstractions, and clever indirection are discouraged unless they eliminate significant repetition.

*Rationale:* Future maintainers (including future versions of the current team) must understand system behavior quickly.

### 17. Fail Visibly

**Errors must surface immediately and clearly rather than being silently swallowed.** The system prefers alerting the user to a problem over quietly degrading functionality.

*Rationale:* Silent failures lead to data loss and user confusion. Athletes need to know when something didn't work as expected.

---

## Engineering Quality Guardrails

These are **enforceable rules** that apply to all code contributions. They are non-negotiable standards for production code.

### 21. No Temporary Workarounds

**The following are explicitly prohibited in all code:**
- `any` type (in any form)
- `as any` type assertions
- `@ts-ignore` directives
- `@ts-nocheck` directives
- Comments containing "temporary workaround", "temporary fix", "quick fix", "to fix later", "FIXME", "HACK", or similar language that excuse incomplete implementation
- `TODO` comments that mask missing functionality or postpone proper solutions
- Placeholder logic or stub implementations intended for later completion
- Creating documentation files (`.md`) as a substitute for actual implementation

**Allowed exceptions:**
- The `unknown` type is permitted **only when** followed immediately by proper runtime type narrowing and validation

**When a clean solution is not immediately possible:**
- Break the task into smaller, independently completable increments
- Fail explicitly with clear, actionable error messages (detailed diagnostics in logs only, never exposed to users)
- Reject the implementation until it can be done properly

*Rationale:* "Temporary" workarounds become permanent technical debt. Type safety violations create runtime bugs that are difficult to trace and debug. Athletes depend on reliable software; we cannot compromise on code quality for convenience.

### 22. Strict Type Safety Required

**All TypeScript code must:**
- Use `tsconfig.json` with `strict: true` enabled
- Prefer type narrowing over type assertions
- Never accept untyped `req.body` or similar input objects
- Validate all external inputs through DTOs or schema validation libraries

*Rationale:* TypeScript's type system catches entire classes of bugs at compile time. Bypassing it negates its value and introduces runtime errors.

### 23. Controllers Must Be Thin

**Controllers (HTTP handlers, API endpoints) must:**
- Contain zero business logic
- Delegate all processing to application services or use-case handlers
- Only handle: request parsing, calling services, formatting responses

*Rationale:* Thin controllers keep business logic testable, reusable, and independent of delivery mechanisms. This enables easier refactoring and testing.

### 24. DTO/Schema Validation Is Mandatory

**All API endpoints must:**
- Validate inputs using DTOs (Data Transfer Objects) or schema validation
- Reject unknown fields (use whitelist approach with `forbidNonWhitelisted`)
- Return consistent, safe error messages (no internal implementation details exposed)

*Rationale:* Unvalidated inputs are the source of security vulnerabilities and runtime crashes. Consistent validation creates predictable API behavior.

### 25. Migrations Required for Database Changes

**All database schema changes must:**
- Use migration files (e.g., Prisma migrations, SQL migration scripts)
- Never rely on push-only workflows or schema sync in production
- Include both forward (up) and rollback (down) paths where applicable

*Rationale:* Migrations provide a versioned, auditable history of schema changes. They enable safe deployments, rollbacks, and coordination across environments.

### 26. No New Documentation Unless Requested

**Documentation creation rules:**
- Do not create new `.md` files unless explicitly requested by the user
- Updating existing `README.md` or in-code documentation is allowed when behavior changes
- Inline code comments are encouraged for complex logic

*Rationale:* Excessive documentation becomes stale and unmaintained. Code should be self-documenting where possible. Documentation is valuable only when explicitly needed.

---

## Enforcement & Quality Gates

### Required Before Merge

All code must pass the following gates before being merged to the main branch:

1. **Type Check:** TypeScript compilation with `strict: true` must succeed with zero errors
2. **Lint:** Code must pass all linting rules with zero warnings
3. **Tests:** All existing tests must pass; new code must include tests with minimum coverage for changed areas

### AI Agent Compliance

When AI agents (including Cursor, GitHub Copilot, or similar tools) suggest code:

- **Reject suggestions that violate quality guardrails** (e.g., using `as any`, skipping validation)
- **Fix violations properly** rather than accepting shortcuts
- **AI-generated code is not exempt** from the same standards as human-written code

*Rationale:* Quality standards protect the long-term health of the codebase. Automated tools can accelerate development but must not compromise standards.

---

## AI Principles

### 18. Explainability is Mandatory

**Every AI-generated recommendation must include a clear, honest explanation of the reasoning.** Athletes have the right to understand why the system suggests a particular action. AI recommendations must not be positioned as medical or clinical advice.

*Rationale:* Training is personal and consequential. Athletes cannot trust recommendations they don't understand, and blind adherence to AI advice is dangerous.

### 19. User Control Always Retained

**Athletes can always override, ignore, or modify AI recommendations without penalty or friction.** The AI is an advisor, not a dictator.

*Rationale:* Athletes know their bodies and contexts better than any model. The platform augments human judgment; it does not replace it.

### 20. No Black Box Training Plans

**AI-generated training programs must decompose into understandable principles and progressions.** Athletes should be able to learn the underlying logic, not just follow instructions blindly.

*Rationale:* Education is part of the platform's value. Athletes who understand training principles make better decisions even without the platform.

---

## Non-Goals & Scope Guardrails

### Explicit Non-Goals

The following are **explicitly out of scope** for HybridPeaks:

- **Social network features:** No public profiles, follower systems, or social feeds. Athletes may share progress if they choose, but HybridPeaks is not a social platform.

- **Nutrition micro-management:** Detailed meal planning, macro tracking, and recipe databases are outside the scope. The platform may surface basic nutritional guidance but does not replace dedicated nutrition tools.

- **General fitness tracking:** HybridPeaks serves hybrid athletes, not general fitness enthusiasts. Pure bodybuilding, pure endurance sports, or casual fitness are not target use cases.

- **Competition management:** The platform does not organize events, manage race registrations, or provide competition bracketing.

- **Wearable device replacement:** HybridPeaks integrates with wearables but does not attempt to replace them with proprietary hardware.

- **Coaching marketplace:** The platform may enable athletes to work with coaches, but it is not a marketplace connecting athletes to coaches for hire.

### Scope Guardrails

These constraints protect the platform's focus and maintainability:

- **Do not build when integrating is sufficient:** If a high-quality external tool solves a problem well, integrate rather than rebuild.

- **Do not optimize for elite-only use cases:** The platform serves athletes from intermediate to elite, but features exclusively useful to the top 1% are not prioritized.

- **Do not require perfect data:** The platform must provide value even when athletes have incomplete historical data or use the platform inconsistently.

- **Do not assume single training methodology:** The platform accommodates various training philosophies (periodization models, volume landmarks, intensity distributions) without enforcing one.

---

## Governance

### Amendment Procedure

1. Proposed amendments must be documented with clear rationale and impact analysis.
2. The Sync Impact Report format MUST be used to assess effects on dependent artifacts.
3. Version increments follow semantic versioning:
   - **MAJOR:** Removal or redefinition of principles that break backward compatibility.
   - **MINOR:** Addition of new principles or material expansion of guidance.
   - **PATCH:** Clarifications, wording improvements, or non-semantic refinements.
4. All dependent templates and documentation MUST be updated before the amendment is finalized.

### Versioning Policy

The constitution version is independent of software release versions. Constitution changes are ratified when dependent artifacts are synchronized and the Sync Impact Report is complete.

### Compliance Review

Engineering decisions, product proposals, and design changes should reference the relevant constitutional principles they uphold. When a decision appears to conflict with a principle, the team must either:

- Revise the decision to align with the principle, or
- Propose a constitutional amendment with clear justification.

Principles are not absolute laws but are strong defaults. Deviation requires explicit reasoning.

---

## Adoption

This constitution is ratified as of 2025-12-28 and supersedes any prior informal guidance or principles.

**Signed,**  
*HybridPeaks Founding Team*
