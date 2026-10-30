# School WhatsApp Operations Assistant (Spec-Driven Development)
## AI Product Engineer - Codigo Facilito - Homework 

A local prototype for an elementary school's pickup authorization workflow, designed around the needs of a school serving 300 students and coordinated by Sofía. It demonstrates registration, gate verification, and academic-query redirection without requiring parents or teachers to install an application.

This repository does not connect to WhatsApp or a persistent school database. It uses an in-memory sample registry and console output; authorizations are lost when the process exits.

---

## Deliverables Architecture

1. **Persistent Context (`AGENT_INSTRUCTIONS.md`):** Global operational scope, WhatsApp constraints, and core development instructions for AI agents.
2. **Feature Specification (`specs/pickup-authorization-spec.md`):** Formal problem definition, solution architecture, and 5 verifiable Acceptance Criteria (AC-1 to AC-5) for same-day student pickup authorizations.
3. **Brand Design Skill (`skills/brand-guidelines.md`):** Conversational identity, tone matrix (parents vs. gatekeepers), color palette, and WhatsApp design rules.
4. **Implementation & Tests (`src/` and `tests/`):** Zero-dependency Node.js prototype implementing the spec and verified against an automated test suite.

---

## Getting Started

### Prerequisites
- Node.js v18 or later.

### Run Automated Acceptance Tests
```bash
npm test