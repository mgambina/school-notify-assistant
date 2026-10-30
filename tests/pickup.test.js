import { test, describe, beforeEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/index.js';
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
          studentName: 'Lucas Demo',
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
          studentName: 'Lucas Demo',
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
          studentName: 'Lucas Demo',
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
          studentName: 'Lucas Demo',
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
      studentName: 'Lucas Demo',
      authorizedPerson: {
        name: 'Familiar Demo',
        idNumber: 'DEMO1234',
        relationship: 'Tía'
      }
    });

    assert.equal(response.success, true);
    assert.match(response.code, /^#PICK-[A-Z0-9]{4,6}$/);
    assert.match(response.message, /Lucas Demo \(3ro A\)/);
    assert.match(response.message, /Familiar Demo/);
    assert.match(response.message, /DEMO1234/);

    const secondResponse = registerEmergencyPickup({
      studentName: 'Lucas Demo',
      authorizedPerson: {
        name: 'Familiar Demo',
        idNumber: 'DEMO1234',
        relationship: 'Tía'
      }
    });
    assert.notEqual(secondResponse.code, response.code);
  });

  test('AC-4: Gate check requires matching name and ID for permanent and same-day authorization', () => {
    registerEmergencyPickup({
      studentName: 'Lucas Demo',
      authorizedPerson: {
        name: 'Familiar Demo',
        idNumber: 'DEMO1234',
        relationship: 'Tía'
      }
    });

    const checkValid = gateCheck('Lucas Demo', { name: 'Familiar Demo', idNumber: 'DEMO1234' });
    assert.equal(checkValid.status, 'AUTHORIZED');

    const wrongId = gateCheck('Lucas Demo', { name: 'Familiar Demo', idNumber: 'DEMO9999' });
    assert.equal(wrongId.status, 'UNAUTHORIZED');

    const checkGuardian = gateCheck('Lucas Demo', { name: 'Elena Demo', idNumber: 'DEMO1122' });
    assert.equal(checkGuardian.status, 'AUTHORIZED');

    const checkInvalid = gateCheck('Lucas Demo', { name: 'Persona Desconocida', idNumber: 'DEMO8888' });
    assert.equal(checkInvalid.status, 'UNAUTHORIZED');
    assert.match(checkInvalid.message, /NO entregar al alumno/);

    database.temporaryAuthorizations[0].pickupDate = '2000-01-01';
    const expiredAuthorization = gateCheck('Lucas Demo', { name: 'Familiar Demo', idNumber: 'DEMO1234' });
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

  describe('Browser demo HTTP API', () => {
    let server;
    let baseUrl;

    before(async () => {
      server = createServer();
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
      if (!server) return;
      await new Promise(resolve => {
        server.close(resolve);
        server.closeAllConnections();
      });
    });

    async function postJson(path, payload) {
      return fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    test('serves the browser interface', async () => {
      const response = await fetch(baseUrl);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.match(html, /id="operation-form"/);
    });

    test('registers submitted details and verifies name plus ID', async () => {
      const registration = await postJson('/api/register', {
        studentName: 'Lucas Demo',
        name: 'Browser Demo Adult',
        idNumber: 'WEB12345',
        relationship: 'Aunt'
      });
      const registrationBody = await registration.json();

      assert.equal(registration.status, 201);
      assert.match(registrationBody.reply, /Browser Demo Adult/);
      assert.deepEqual(database.temporaryAuthorizations[0].authorizedPerson, {
        name: 'Browser Demo Adult',
        idNumber: 'WEB12345',
        relationship: 'Aunt'
      });

      const authorized = await postJson('/api/gate-check', {
        studentName: 'Lucas Demo',
        name: 'Browser Demo Adult',
        idNumber: 'WEB12345'
      });
      assert.equal(authorized.status, 200);
      assert.equal((await authorized.json()).status, 'AUTHORIZED');

      const wrongId = await postJson('/api/gate-check', {
        studentName: 'Lucas Demo',
        name: 'Browser Demo Adult',
        idNumber: 'WEB99999'
      });
      assert.equal((await wrongId.json()).status, 'UNAUTHORIZED');
    });

    test('rejects invalid requests and does not register ordinary or academic messages', async () => {
      const invalid = await postJson('/api/register', {
        studentName: 'Lucas Demo',
        name: 'Browser Demo Adult',
        idNumber: 'WEB12345'
      });
      assert.equal(invalid.status, 400);
      assert.equal(database.temporaryAuthorizations.length, 0);

      const academic = await postJson('/api/chat', { message: '¿Qué notas obtuvo Lucas?' });
      assert.match((await academic.json()).reply, /portal académico oficial/);

      const ordinary = await postJson('/api/chat', { message: 'Hola, ¿cómo estás?' });
      assert.equal(ordinary.status, 200);
      assert.equal(database.temporaryAuthorizations.length, 0);
    });
  });
});