# ADR 0001 – Llave de idempotencia de punta a punta

**Estado:** propuesta · **Ámbito:** Préstamos de Renta Particular

## Contexto

Cuando el proxy de INARI responde 502, el cliente reintenta y el backend envía una solicitud nueva sin relación con la
anterior, aunque admwr haya ejecutado la primera. No existe un identificador que vincule los intentos.

## Decisión

- La Zona Segura genera un `Idempotency-Key` (UUID v4) por **intención** de préstamo y lo reutiliza en todos los
  reintentos de esa intención.
- La Loans API lo persiste con `UNIQUE` junto con un hash del payload: la misma llave con el mismo payload devuelve
  la solicitud existente; con otro payload responde `422`.
- El worker y el reconciliador envían a admwr **siempre la misma llave**; admwr la guarda con `UNIQUE`.

## Consecuencias

- Reintentar se vuelve seguro en cada salto (cliente → API → INARI).
- Requiere un cambio en admwr para deduplicar en origen (ver ADR 0003 para el plan B si no es posible).
- Las llaves se conservan al menos durante el período de reconciliación y auditoría.
