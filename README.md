# School WhatsApp Operations Assistant (Spec-Driven Development)
## AI Product Engineer - Codigo Facilito - Homework 

An automated WhatsApp operations engine designed for an elementary school serving 300 students, coordinated by Sofía. The project eliminates paper communication and unsafe dismissal pickups without requiring parents or teachers to install any third-party applications.

---

## Deliverables Architecture

1. **Persistent Context (`AGENT_INSTRUCTIONS.md`):** Global operational scope, WhatsApp constraints, and core development instructions for AI agents.
2. **Feature Specification (`specs/pickup-authorization-spec.md`):** Formal problem definition, solution architecture, and 5 verifiable Acceptance Criteria (AC-1 to AC-5) for same-day student pickup authorizations.
3. **Brand Design Skill (`skills/brand-guidelines.md`):** Conversational identity, tone matrix (parents vs. gatekeepers), color palette, and WhatsApp design rules.
4. **Implementation & Tests (`src/` and `tests/`):** Zero-dependency Node.js service implementing the spec and verified against an automated test suite.

---

## Getting Started

### Prerequisites
- Node.js v18 or later.

### Run Automated Acceptance Tests
```bash
npm test