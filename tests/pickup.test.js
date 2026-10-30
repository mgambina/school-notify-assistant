import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { 
  registerEmergencyPickup, 
  gateCheck, 
  handleIncomingQuery, 
  database 
} from '../src/pickup-service.js';

describe('Spec Verification: Emergency Pickup Authorization', () => {

  beforeEach(() => {
    database.temporaryAuthorizations = [];
  });

  test('AC-1: Must reject unregistered student', () => {
    assert.throws(
      () => {
        registerEmergencyPickup({
          studentName: 'Julian Alvarez',
          authorizedPerson: {
            name: 'Carlos Gomez',
            idNumber: '35123456',
            relationship: 'Tío'
          }
        });
      },
      /AC-1: Student 'Julian Alvarez' is not registered/
    );
  });

  test('AC-2: Must enforce mandatory fields (name, idNumber >= 6 chars, relationship)', () => {
    assert.throws(
      () => {
        registerEmergencyPickup({
          studentName: 'Lucas Martinez',
          authorizedPerson: {
            name: 'Clara Gomez',
            idNumber: '',
            relationship: 'Tía'
          }
        });
      },
      /AC-2: A valid National ID/
    );

    assert.throws(
      () => {
        registerEmergencyPickup({
          studentName: 'Lucas Martinez',
          authorizedPerson: {
            name: 'Clara Gomez',
            idNumber: '123',
            relationship: 'Tía'
          }
        });
      },
      /AC-2: A valid National ID/
    );
  });

  test('AC-3: Must issue a valid confirmation and tracking code matching #PICK-[A-Z0-9]{4,6}', () => {
    const response = registerEmergencyPickup({
      studentName: 'Lucas Martinez',
      authorizedPerson: {
        name: 'Clara Gomez',
        idNumber: '34567890',
        relationship: 'Tía'
      }
    });

    assert.equal(response.success, true);
    assert.match(response.code, /^#PICK-[A-Z0-9]{4,6}$/);
    assert.match(response.message, /Lucas Martinez \(3ro A\)/);
    assert.match(response.message, /Clara Gomez/);
  });

  test('AC-4: Gate check verifies authorized guardian and flags unauthorized attempts', () => {
    registerEmergencyPickup({
      studentName: 'Lucas Martinez',
      authorizedPerson: {
        name: 'Clara Gomez',
        idNumber: '34567890',
        relationship: 'Tía'
      }
    });

    const checkValid = gateCheck('Lucas Martinez', 'Clara Gomez');
    assert.equal(checkValid.status, 'AUTHORIZED');

    const checkInvalid = gateCheck('Lucas Martinez', 'Desconocido Perez');
    assert.equal(checkInvalid.status, 'UNAUTHORIZED');
    assert.match(checkInvalid.message, /NO entregar al alumno/);
  });

  test('AC-5: Out-of-scope queries (grades, homework) must be rejected', () => {
    const gradeQuery = handleIncomingQuery('Hola, ¿me pasas las notas de Lucas?');
    assert.equal(
      gradeQuery,
      'Las consultas sobre notas, tareas o boletines se canalizan a través del portal académico oficial. Solo gestiono autorizaciones y retiros de alumnos.'
    );

    const normalQuery = handleIncomingQuery('Quiero registrar un retiro para hoy');
    assert.equal(normalQuery, null);
  });
});