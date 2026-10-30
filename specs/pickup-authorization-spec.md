# Feature Specification: Emergency Same-Day Student Pickup Authorization

## 1. Problem Definition
At dismissal time, teachers at the school gate face safety and operational risks when an unannounced adult arrives to pick up an elementary student. Parents currently rely on last-minute phone calls, loose paper notes, or informal messages in large classroom WhatsApp groups. These notes get misplaced or go unnoticed, leaving gate staff uncertain whether they can safely release the child.

## 2. Solution Design
An automated WhatsApp interaction flow that enables a registered parent/guardian to delegate a temporary, same-day authorized adult for student pickup.
The system:
1. Validates that the requested student exists in the school registry.
2. Captures mandatory third-party pickup details: Full Legal Name, National ID (DNI/Passport), and Relationship to the student.
3. Generates a unique, timestamped authorization code (`#PICK-XXXX`).
4. Updates the daily gate registry so teachers can instantly query and verify the adult's identity at dismissal, or receive an immediate escalation alert if the person is unauthorized.

## 3. Verifiable Acceptance Criteria

- **AC-1 (Student Validation):**
  - Given a pickup registration request, the system MUST verify that the student is registered in the school database.
  - If the student is not found, the registration MUST be rejected with an explicit error message, and no authorization record may be created.

- **AC-2 (Mandatory Data Capture):**
  - Registration MUST require:
    1. Authorized person's Full Legal Name (non-empty string).
    2. National ID number (alphanumeric, minimum 6 characters).
    3. Relationship to student (e.g., aunt, grandparent, family friend).
  - If any of these three fields is missing or invalid, the system MUST reject the registration and prompt for the missing data.

- **AC-3 (Deterministic Confirmation & Tracking Code):**
  - Upon successful registration, the system MUST return a single confirmation message containing:
    - Student Name and Grade.
    - Authorized person's Name and National ID.
    - Timestamp of registration.
    - A unique tracking code matching the pattern `^#PICK-[A-Z0-9]{4,6}$`.

- **AC-4 (Gatekeeper Verification & Alert):**
  - When staff queries a student's pickup status (`gateCheck`), if the person attempting pickup matches either a permanent guardian or a valid same-day authorized person, the system MUST return status `AUTHORIZED`.
  - If the person attempting pickup is not on the permanent or emergency list, the system MUST return status `UNAUTHORIZED` with an explicit directive instructing staff NOT to release the student and to alert coordination.

- **AC-5 (Out-of-Scope Boundary Enforcement):**
  - Any query containing keywords related to academic grades, homework, or report cards MUST be rejected with a standardized refusal redirecting the user to the school's primary academic portal.