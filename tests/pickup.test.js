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
    assert.equal(database.temporaryAuthorizations.length, 0);
  });

  test('AC-2: Must enforce mandatory fields and an alphanumeric ID of at least 6 characters', () => {
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

    assert.throws(
      () => {
        registerEmergencyPickup({
          studentName: 'Lucas Martinez',
          authorizedPerson: {
            name: 'Clara Gomez',
            idNumber: '12-345',
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
            idNumber: '34567890',
            relationship: ' '
          }
        });
      },
      /AC-2: Relationship to the student is mandatory/
    );
  });

  test('AC-3: Must issue a confirmation with a unique tracking code matching #PICK-[A-Z0-9]{4,6}', () => {
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
    assert.match(response.message, /34567890/);

    const secondResponse = registerEmergencyPickup({
      studentName: 'Lucas Martinez',
      authorizedPerson: {
        name: 'Clara Gomez',
        idNumber: '34567890',
        relationship: 'Tía'
      }
    });
    assert.notEqual(secondResponse.code, response.code);
  });

  test('AC-4: Gate check requires matching name and ID for permanent and same-day authorization', () => {
    registerEmergencyPickup({
      studentName: 'Lucas Martinez',
      authorizedPerson: {
        name: 'Clara Gomez',
        idNumber: '34567890',
        relationship: 'Tía'
      }
    });

    const checkValid = gateCheck('Lucas Martinez', { name: 'Clara Gomez', idNumber: '34567890' });
    assert.equal(checkValid.status, 'AUTHORIZED');

    const wrongId = gateCheck('Lucas Martinez', { name: 'Clara Gomez', idNumber: '99999999' });
    assert.equal(wrongId.status, 'UNAUTHORIZED');

    const checkGuardian = gateCheck('Lucas Martinez', { name: 'Elena Gambina', idNumber: '30111222' });
    assert.equal(checkGuardian.status, 'AUTHORIZED');

    const checkInvalid = gateCheck('Lucas Martinez', { name: 'Desconocido Perez', idNumber: '12345678' });
    assert.equal(checkInvalid.status, 'UNAUTHORIZED');
    assert.match(checkInvalid.message, /NO entregar al alumno/);

    database.temporaryAuthorizations[0].pickupDate = '2000-01-01';
    const expiredAuthorization = gateCheck('Lucas Martinez', { name: 'Clara Gomez', idNumber: '34567890' });
    assert.equal(expiredAuthorization.status, 'UNAUTHORIZED');
  });

  test('AC-5: Academic keywords are rejected regardless of case or Spanish diacritics', () => {
    const gradeQuery = handleIncomingQuery('Hola, ¿me pasas las notas de Lucas?');
    assert.equal(
      gradeQuery,
      'Las consultas sobre notas, tareas o boletines se canalizan a través del portal académico oficial. Solo gestiono autorizaciones y retiros de alumnos.'
    );
    assert.notEqual(handleIncomingQuery('¿Me compartes el boletín de Lucas?'), null);
    assert.notEqual(handleIncomingQuery('Can you send the report cards?'), null);

    const normalQuery = handleIncomingQuery('Quiero registrar un retiro para hoy');
    assert.equal(normalQuery, null);
    assert.equal(handleIncomingQuery('Anotaste el horario de retiro'), null);
  });
});