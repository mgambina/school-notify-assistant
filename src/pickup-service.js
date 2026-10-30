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

function normalizeText(value) {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    : '';
}

function getLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Registers an emergency same-day pickup authorization (Implements AC-1, AC-2, AC-3)
 */
export function registerEmergencyPickup({ studentName, authorizedPerson }) {
  // AC-1: Student validation
  if (!studentName || typeof studentName !== 'string') {
    throw new Error("AC-1: Student name is required.");
  }

  const student = database.students.find(s => normalizeText(s.name) === normalizeText(studentName));

  if (!student) {
    throw new Error(`AC-1: Student '${studentName}' is not registered in the school.`);
  }

  // AC-2: Mandatory data capture
  const { name, idNumber, relationship } = authorizedPerson || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error("AC-2: Authorized person full legal name is mandatory.");
  }

  const normalizedIdNumber = typeof idNumber === 'string' ? idNumber.trim() : '';
  if (!/^[A-Za-z0-9]{6,}$/.test(normalizedIdNumber)) {
    throw new Error("AC-2: A valid National ID (DNI/Passport) must be alphanumeric and at least 6 characters.");
  }

  if (!relationship || typeof relationship !== 'string' || relationship.trim().length === 0) {
    throw new Error("AC-2: Relationship to the student is mandatory.");
  }

  // AC-3: Deterministic code and confirmation
  let code;
  do {
    const randomHash = crypto.randomBytes(3).toString('hex').toUpperCase();
    code = `#PICK-${randomHash}`;
  } while (database.temporaryAuthorizations.some(authorization => authorization.code === code));

  const now = new Date();
  const timestamp = now.toISOString();

  const record = {
    code,
    timestamp,
    pickupDate: getLocalDate(now),
    studentId: student.id,
    studentName: student.name,
    grade: student.grade,
    authorizedPerson: {
      name: name.trim(),
      idNumber: normalizedIdNumber,
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
export function gateCheck(studentName, personAttemptingPickup = {}) {
  const student = database.students.find(s => normalizeText(s.name) === normalizeText(studentName));

  if (!student) {
    return {
      status: "STUDENT_NOT_FOUND",
      message: `*CONTROL DE PUERTA* ⚠️\nEl alumno '${studentName}' no figura en el padrón escolar.`
    };
  }

  const { name: pickupName, idNumber: pickupIdNumber } = personAttemptingPickup || {};
  const normalizedPickupName = normalizeText(pickupName);
  const normalizedPickupId = normalizeText(pickupIdNumber);
  const emergencyToday = database.temporaryAuthorizations.filter(
    authorization => authorization.studentId === student.id && authorization.pickupDate === getLocalDate(new Date())
  );

  const isPermanent = student.permanentGuardians.some(
    guardian => normalizeText(guardian.name) === normalizedPickupName
      && normalizeText(guardian.idNumber) === normalizedPickupId
  );

  const isEmergency = emergencyToday.some(
    authorization => normalizeText(authorization.authorizedPerson.name) === normalizedPickupName
      && normalizeText(authorization.authorizedPerson.idNumber) === normalizedPickupId
  );

  if (isPermanent || isEmergency) {
    return {
      status: "AUTHORIZED",
      student: student.name,
      grade: student.grade,
      pickupPerson: pickupName,
      message: [
        `*CONTROL DE PUERTA - AUTORIZADO* ✅`,
        `- Alumno: ${student.name} (${student.grade})`,
        `- Retira: ${pickupName}`,
        `- Estado: Verificado contra padrón oficial.`
      ].join('\n')
    };
  }

  return {
    status: "UNAUTHORIZED",
    student: student.name,
    grade: student.grade,
    pickupPerson: pickupName,
    message: [
      `*ALERTA DE SEGURIDAD - NO AUTORIZADO* ⚠️`,
      `- Alumno: ${student.name} (${student.grade})`,
      `- Persona en puerta: ${pickupName || 'No identificada'}`,
      `- Acción: NO entregar al alumno. Notificar de inmediato a Sofía (Coordinación).`
    ].join('\n')
  };
}

/**
 * Out-of-scope guardrail (Implements AC-5)
 */
export function handleIncomingQuery(text) {
  const forbiddenKeywords = [
    'nota', 'notas', 'tarea', 'tareas', 'boletin', 'boletines', 'examen', 'examenes',
    'calificacion', 'calificaciones', 'grade', 'grades', 'homework', 'report card', 'report cards'
  ];
  const normalizedQuery = normalizeText(text).replace(/[^a-z0-9]+/g, ' ');
  const paddedQuery = ` ${normalizedQuery} `;
  const hasForbidden = forbiddenKeywords.some(keyword => paddedQuery.includes(` ${keyword} `));

  if (hasForbidden) {
    return "Las consultas sobre notas, tareas o boletines se canalizan a través del portal académico oficial. Solo gestiono autorizaciones y retiros de alumnos.";
  }

  return null;
}