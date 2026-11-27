# ADR 0002 – Procesamiento asíncrono con 202, cola y outbox

**Estado:** propuesta · **Ámbito:** Préstamos de Renta Particular

## Contexto

El flujo síncrono ata la experiencia del cliente a la latencia de INARI; los timeouts del proxy se muestran como
errores aunque la operación avance.

## Decisión

- `POST /v1/loans` registra la solicitud y responde `202 Accepted` con `loanId`; el cliente sigue el estado con
  `GET /v1/loans/{id}`, SSE o notificación push.
- La solicitud y el evento se escriben en la **misma transacción** (patrón outbox); un relay publica en Pub/Sub.
- Un worker consume la cola y llama a INARI con concurrencia acotada.

## Alternativas descartadas

- **Aumentar el timeout del proxy:** reduce los 502 pero no los elimina ni evita duplicados.
- **Publicar directo en la cola desde la API:** si la API cae entre la escritura en BD y la publicación, la
  solicitud queda huérfana. El outbox lo evita sin transacciones distribuidas.

## Consecuencias

- La UX deja de depender de INARI y el cliente nunca ve un 502.
- La entrega es at-least-once: el worker debe ser idempotente (transiciones condicionadas por estado y versión).
- Se agrega un componente (relay) y la necesidad de monitorear la cola y la DLQ.
