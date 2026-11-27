# ADR 0003 – Estado UNKNOWN y reconciliación en lugar de reintentos ciegos

**Estado:** propuesta · **Ámbito:** Préstamos de Renta Particular

## Contexto

Un 502 o un timeout no indica si admwr ejecutó el desembolso. Reintentar automáticamente ante ese error reproduce
el problema actual dentro del backend.

## Decisión

- Ante 502, 504, timeout o caída de red, el worker marca la solicitud `UNKNOWN` y **no reintenta**.
- Un reconciliador (Cloud Scheduler + Cloud Run Job) toma lotes `UNKNOWN` con `FOR UPDATE SKIP LOCKED` y consulta
  `GET /disbursements/{key}` en admwr:
  - `EXECUTED` → `DISBURSED`.
  - `NOT_FOUND` → re-encola con la misma llave (backoff exponencial con jitter).
  - Sin respuesta tras N intentos o vencido el SLA → `MANUAL_REVIEW` y alerta.
- Si admwr no puede exponer la consulta por llave, se busca el movimiento por póliza + monto + ventana de fecha; las
  coincidencias ambiguas van siempre a `MANUAL_REVIEW`.

## Consecuencias

- Ningún reintento ocurre sin confirmar que la operación anterior no se ejecutó.
- Algunas solicitudes tardan más en confirmarse (minutos), pero el cliente ve "en proceso" en vez de un error.
- Operaciones necesita una bandeja para `MANUAL_REVIEW`.
