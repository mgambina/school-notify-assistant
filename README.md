# School Pickup Authorization Demo (Spec-Driven Development)
## AI Product Engineer - Codigo Facilito - Homework 

A browser-based prototype for an elementary school's pickup authorization workflow, designed around the needs of a school serving 300 students and coordinated by Sofía. It demonstrates registration, gate verification, and academic-query redirection without requiring parents or teachers to install an application.

This repository does not connect to WhatsApp or a persistent school database. It uses synthetic sample records stored in memory; authorizations are lost when the process exits. Do not enter real student or identity information.

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

### Run the web demo
```bash
npm start
```
Open `http://localhost:3000`. In CodeSandbox, start the same command and open the preview for port `3000` (or the port shown in the terminal).

### Run Automated Acceptance Tests
```bash
npm test