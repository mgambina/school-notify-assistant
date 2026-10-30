import http from 'node:http';
import { registerEmergencyPickup, gateCheck, handleIncomingQuery, database } from './pickup-service.js';

const PORT = process.env.PORT || 3000;

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SofIA - Demo Retiro Escolar</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0b141a; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 15px; }
    .chat-container { width: 100%; max-width: 480px; height: 90vh; background: #efeae2; display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: #075e54; color: white; padding: 16px; display: flex; align-items: center; gap: 12px; }
    .header-info h2 { font-size: 16px; }
    .header-info p { font-size: 12px; opacity: 0.8; }
    .messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background-image: radial-gradient(#d1d7db 1px, transparent 1px); background-size: 16px 16px; }
    .msg { max-width: 85%; padding: 10px 14px; border-radius: 8px; font-size: 14px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
    .msg.bot { background: white; align-self: flex-start; border-bottom-left-radius: 2px; }
    .msg.user { background: #d9fdd3; align-self: flex-end; border-bottom-right-radius: 2px; }
    .presets { padding: 8px 12px; background: #f0f2f5; display: flex; gap: 6px; overflow-x: auto; border-top: 1px solid #e9edef; }
    .chip { font-size: 11px; padding: 6px 10px; background: white; border: 1px solid #cbd5e1; border-radius: 16px; cursor: pointer; white-space: nowrap; font-weight: 500; }
    .chip:hover { background: #e2e8f0; }
    .input-bar { display: flex; padding: 10px; background: #f0f2f5; gap: 8px; }
    input { flex: 1; padding: 10px 14px; border-radius: 20px; border: 1px solid #ccc; outline: none; font-size: 14px; }
    button { background: #00a884; color: white; border: none; padding: 10px 18px; border-radius: 20px; cursor: pointer; font-weight: bold; }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="header">
      <div style="width: 36px; height: 36px; background: #128c7e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">🏫</div>
      <div class="header-info">
        <h2>SofIA - Escuela Primaria</h2>
        <p>Asistente de Retiros & Autorizaciones</p>
      </div>
    </div>
    <div class="messages" id="chat">
      <div class="msg bot">👋 ¡Hola! Soy el asistente operativo de la escuela de Sofía.\n\nPuedes probar:\n1. Delegar retiro de emergencia.\n2. Consultar como docente en la puerta.\n3. Probar una consulta de notas (fuera de alcance).</div>
    </div>
    <div class="presets">
      <button class="chip" onclick="sendPreset('Quiero autorizar a mi tía Mariana Gambina DNI 34567890 a retirar a Lucas Martinez')">📝 Autorizar Retiro</button>
      <button class="chip" onclick="sendPreset('CHECK Lucas Martinez - retira Mariana Gambina')">🔍 Verificación OK</button>
      <button class="chip" onclick="sendPreset('CHECK Lucas Martinez - retira Carlos Gomez')">⚠️ Verificación Fallida</button>
      <button class="chip" onclick="sendPreset('¿Qué notas sacó Lucas en matemáticas?')">🚫 Notas (Scope)</button>
    </div>
    <div class="input-bar">
      <input type="text" id="userInput" placeholder="Escribe un mensaje de WhatsApp..." onkeydown="if(event.key==='Enter') sendMessage()" />
      <button onclick="sendMessage()">Enviar</button>
    </div>
  </div>
  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('userInput');

    function addMessage(text, sender) {
      const div = document.createElement('div');
      div.className = 'msg ' + sender;
      div.innerText = text;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function sendPreset(text) {
      input.value = text;
      sendMessage();
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      addMessage(text, 'user');
      input.value = '';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      addMessage(data.reply, 'bot');
    }
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML_CONTENT);
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { message } = JSON.parse(body || '{}');
        
        // 1. Check out of scope
        const outOfScope = handleIncomingQuery(message);
        if (outOfScope) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ reply: outOfScope }));
        }

        // 2. Check gatekeeper lookup
        if (message.toUpperCase().startsWith('CHECK')) {
          const parts = message.replace(/CHECK/i, '').split('-').map(s => s.trim());
          const student = parts[0] || 'Lucas Martinez';
          const person = parts[1] ? parts[1].replace(/retira/i, '').trim() : 'Desconocido';
          const result = gateCheck(student, person);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ reply: result.message }));
        }

        // 3. Fallback to emergency registration demo
        const result = registerEmergencyPickup({
          studentName: "Lucas Martinez",
          authorizedPerson: {
            name: "Mariana Gambina",
            idNumber: "34567890",
            relationship: "Tía"
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: result.message }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: "⚠️ Error: " + err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});