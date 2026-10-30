import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { gateCheck, handleIncomingQuery, registerEmergencyPickup } from './pickup-service.js';

const HTML_CONTENT = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const MAX_BODY_BYTES = 16 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
      } else {
        chunks.push(chunk);
      }
    });

    request.on('end', () => {
      if (tooLarge) {
        const error = new Error('La solicitud supera el tamaño permitido.');
        error.statusCode = 413;
        rejectBody(error);
        return;
      }

      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          throw new Error('El cuerpo debe ser un objeto JSON.');
        }
        resolveBody(body);
      } catch {
        const error = new Error('Envía un objeto JSON válido.');
        error.statusCode = 400;
        rejectBody(error);
      }
    });

    request.on('error', rejectBody);
  });
}

function requireText(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    const error = new Error(`El campo '${fieldName}' es obligatorio.`);
    error.statusCode = 400;
    throw error;
  }
  return value.trim();
}

export function createServer() {
  return http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (request.method === 'GET' && pathname === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(HTML_CONTENT);
      return;
    }

    if (request.method !== 'POST' || !['/api/register', '/api/gate-check', '/api/chat'].includes(pathname)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('No encontrado');
      return;
    }

    try {
      const body = await readJsonBody(request);

      if (pathname === '/api/register') {
        const result = registerEmergencyPickup({
          studentName: requireText(body.studentName, 'studentName'),
          authorizedPerson: {
            name: requireText(body.name, 'name'),
            idNumber: requireText(body.idNumber, 'idNumber'),
            relationship: requireText(body.relationship, 'relationship')
          }
        });
        sendJson(response, 201, { reply: result.message, code: result.code });
        return;
      }

      if (pathname === '/api/gate-check') {
        const result = gateCheck(
          requireText(body.studentName, 'studentName'),
          {
            name: requireText(body.name, 'name'),
            idNumber: requireText(body.idNumber, 'idNumber')
          }
        );
        sendJson(response, 200, { reply: result.message, status: result.status });
        return;
      }

      const message = requireText(body.message, 'message');
      const refusal = handleIncomingQuery(message);
      sendJson(response, 200, {
        reply: refusal || 'Puedo ayudarte a registrar o verificar una autorización de retiro. Elige una opción del panel.'
      });
    } catch (error) {
      const statusCode = error.statusCode || (error.message.startsWith('AC-') ? 400 : 500);
      const message = statusCode >= 500 ? 'Ocurrió un error interno. Inténtalo nuevamente.' : error.message;
      sendJson(response, statusCode, { reply: message });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, '0.0.0.0', () => {
    console.log(`Demo running on port ${port}`);
  });
}