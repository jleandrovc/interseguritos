# ADR 0004 – Control de concurrencia con restricciones de BD y bloqueo optimista

**Estado:** propuesta · **Ámbito:** Préstamos de Renta Particular

## Contexto

Las solicitudes simultáneas (doble clic, varias pestañas, varios dispositivos, varias instancias de la API o del
worker) pueden crear o procesar dos veces la misma operación.

## Decisión

- `UNIQUE(idempotency_key)` y un índice único parcial que permite **una sola solicitud en curso por póliza**.
- Cada transición de estado es `UPDATE … WHERE id = ? AND status = ? AND version = ?`; si no afecta filas, otro
  proceso ganó y el actual descarta su trabajo.
- El reconciliador toma lotes con `FOR UPDATE SKIP LOCKED` para repartir trabajo entre instancias sin bloquearse.

## Alternativas descartadas

- **Locks distribuidos (Redis/Redlock):** suman infraestructura y modos de falla (expiración del lock en mitad de
  la operación); las restricciones de BD dan la misma garantía de forma transaccional.

## Consecuencias

- La garantía de unicidad vive en el mismo sistema que guarda el estado, sin coordinación externa.
- Las violaciones de unicidad se traducen en respuestas de negocio (`200` existente, `409` en curso).
