import crypto from 'node:crypto';

// In-memory mock database of the school
export const database = {
  students: [
    {
      id: "STU-001",
      name: "Lucas Martinez",
      grade: "3ro A",
      permanentGuardians: [
        { name: "Elena Gambina", idNumber: "30111222", relationship: "Madre" },
        { name: "Roberto Martinez", idNumber: "29888777", relationship: "Padre" }
      ]
    },
    {
      id: "STU-002",
      name: "Sofia Gomez",
      grade: "1ro B",
      permanentGuardians: [
        { name: "Mariana Gomez", idNumber: "32444555", relationship: "Madre" }
      ]
    }
  ],
  temporaryAuthorizations: []
};

/**
 * Registers an emergency same-day pickup authorization (Implements AC-1, AC-2, AC-3)
 */
export function registerEmergencyPickup({ studentName, authorizedPerson }) {
  // AC-1: Student validation
  if (!studentName || typeof studentName !== 'string') {
    throw new Error("AC-1: Student name is required.");
  }

  const student = database.students.find(
    s => s.name.toLowerCase() === studentName.trim().toLowerCase()
  );

  if (!student) {
    throw new Error(`AC-1: Student '${studentName}' is not registered in the school.`);
  }

  // AC-2: Mandatory data capture
  const { name, idNumber, relationship } = authorizedPerson || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error("AC-2: Authorized person full legal name is mandatory.");
  }

  if (!idNumber || typeof idNumber !== 'string' || idNumber.trim().length < 6) {
    throw new Error("AC-2: A valid National ID (DNI/Passport) with at least 6 characters is mandatory.");
  }

  if (!relationship || typeof relationship !== 'string' || relationship.trim().length === 0) {
    throw new Error("AC-2: Relationship to the student is mandatory.");
  }

  // AC-3: Deterministic code and confirmation
  const randomHash = crypto.randomBytes(3).toString('hex').toUpperCase();
  const code = `#PICK-${randomHash}`;
  const timestamp = new Date().toISOString();

  const record = {
    code,
    timestamp,
    studentId: student.id,
    studentName: student.name,
    grade: student.grade,
    authorizedPerson: {
      name: name.trim(),
      idNumber: idNumber.trim(),
      relationship: relationship.trim()
    }
  };

  database.temporaryAuthorizations.push(record);

  return {
    success: true,
    code,
    timestamp,
    message: [
      `*ESCUELA PRIMARIA - RETIRO REGISTRADO* ✅`,
      `- Alumno: ${student.name} (${student.grade})`,
      `- Autorizado: ${record.authorizedPerson.name}`,
      `- DNI: ${record.authorizedPerson.idNumber} (${record.authorizedPerson.relationship})`,
      `- Código de Retiro: ${code}`,
      `- Fecha/Hora: ${timestamp}`,
      `Por favor recuerde que la persona autorizada debe presentar su DNI físico en la puerta.`
    ].join('\n')
  };
}

/**
 * Gate check performed by teachers at dismissal (Implements AC-4)
 */
export function gateCheck(studentName, personAttemptingPickup) {
  const student = database.students.find(
    s => s.name.toLowerCase() === studentName.trim().toLowerCase()
  );

  if (!student) {
    return {
      status: "STUDENT_NOT_FOUND",
      message: `*CONTROL DE PUERTA* ⚠️\nEl alumno '${studentName}' no figura en el padrón escolar.`
    };
  }

  const emergencyToday = database.temporaryAuthorizations.filter(
    a => a.studentId === student.id
  );

  const isPermanent = student.permanentGuardians.some(
    g => g.name.toLowerCase() === personAttemptingPickup.trim().toLowerCase()
  );

  const isEmergency = emergencyToday.some(
    a => a.authorizedPerson.name.toLowerCase() === personAttemptingPickup.trim().toLowerCase()
  );

  if (isPermanent || isEmergency) {
    return {
      status: "AUTHORIZED",
      student: student.name,
      grade: student.grade,
      pickupPerson: personAttemptingPickup,
      message: [
        `*CONTROL DE PUERTA - AUTORIZADO* ✅`,
        `- Alumno: ${student.name} (${student.grade})`,
        `- Retira: ${personAttemptingPickup}`,
        `- Estado: Verificado contra padrón oficial.`
      ].join('\n')
    };
  }

  return {
    status: "UNAUTHORIZED",
    student: student.name,
    grade: student.grade,
    pickupPerson: personAttemptingPickup,
    message: [
      `*ALERTA DE SEGURIDAD - NO AUTORIZADO* ⚠️`,
      `- Alumno: ${student.name} (${student.grade})`,
      `- Persona en puerta: ${personAttemptingPickup}`,
      `- Acción: NO entregar al alumno. Notificar de inmediato a Sofía (Coordinación).`
    ].join('\n')
  };
}

/**
 * Out-of-scope guardrail (Implements AC-5)
 */
export function handleIncomingQuery(text) {
  const forbiddenKeywords = ['nota', 'notas', 'tarea', 'tareas', 'boletin', 'examen', 'calificacion', 'grade', 'grades', 'homework'];
  const hasForbidden = forbiddenKeywords.some(k => text.toLowerCase().includes(k));

  if (hasForbidden) {
    return "Las consultas sobre notas, tareas o boletines se canalizan a través del portal académico oficial. Solo gestiono autorizaciones y retiros de alumnos.";
  }

  return null;
}