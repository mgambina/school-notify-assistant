import { registerEmergencyPickup, gateCheck, handleIncomingQuery } from './pickup-service.js';

console.log("=== DEMO: School WhatsApp Operations Assistant ===\n");

console.log("--- 1. Testing Out-of-Scope Query ---");
const outOfScopeResponse = handleIncomingQuery("Hola, ¿cómo le fue a Lucas en la tarea de matemáticas?");
console.log(outOfScopeResponse || "Consulta aceptada.");
console.log();

console.log("--- 2. Registering Emergency Pickup ---");
try {
  const result = registerEmergencyPickup({
    studentName: "Lucas Martinez",
    authorizedPerson: {
      name: "Mariana Gambina",
      idNumber: "34567890",
      relationship: "Tía"
    }
  });
  console.log(result.message);
} catch (error) {
  console.error("Error:", error.message);
}
console.log();

console.log("--- 3. Gate Verification (Authorized Person) ---");
const checkOk = gateCheck("Lucas Martinez", "Mariana Gambina");
console.log(checkOk.message);
console.log();

console.log("--- 4. Gate Verification (Unauthorized Attempt) ---");
const checkFail = gateCheck("Lucas Martinez", "Carlos Perez");
console.log(checkFail.message);