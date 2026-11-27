# Interseguritos – Reto técnico Technical Lead

Monorepo con la solución de los tres ejercicios del reto de Interseguro.

| Componente | Tecnología | Estado |
|---|---|---|
| `endorsement-api/` | Node.js + Hapi + TypeORM + PostgreSQL | Implementado |
| `routes-api/` | Go (`net/http`) + Dijkstra | Implementado |
| `frontend/` | React + Vite | Implementado |
| `architecture/` | Diagramas draw.io y ADRs (préstamos de renta particular) | Implementado – ver [`architecture/README.md`](architecture/README.md) |

## Requisitos

- Docker Desktop (con el daemon en ejecución) y Docker Compose.
- Node.js 22 LTS y Go 1.23+ solo si se ejecuta sin Docker.

## Puesta en marcha local

```bash
cp .env.example .env   # ajustar POSTGRES_PASSWORD y JWT_SECRET
docker compose up -d postgres
```

## Ejercicio 1 – `endorsement-api`

### Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/token` | Pública | Emite un JWT (client credentials) con scopes `endorse:translate` y `routes:calculate` |
| POST | `/api/v1/endorse/translate` | JWT + scope `endorse:translate` | Traduce el JSON plano al JSON del core |
| GET | `/health`, `/health/ready` | Pública | Liveness y readiness (consulta la BD) |
| GET | `/documentation` | Pública | Swagger UI |

La respuesta de `translate` es el documento del core tal cual, con el header `X-Template-Version`.

Errores con formato uniforme `{ statusCode, error, code, message, details }`:

| HTTP | `code` | Causa |
|---|---|---|
| 400 | `INVALID_PAYLOAD` | Falta `producto`/`tipoEndoso`, o un valor no es escalar |
| 401 | `INVALID_CREDENTIALS` / sin token | Credenciales o JWT inválidos |
| 404 | `TEMPLATE_NOT_FOUND` | No hay plantilla activa para producto + tipo de endoso |
| 422 | `MISSING_TEMPLATE_FIELDS` | Faltan campos obligatorios sin valor por defecto (se listan todos) |

### Modelo de datos

```mermaid
erDiagram
  PRODUCT ||--o{ ENDORSEMENT_TEMPLATE : has
  ENDORSEMENT_TYPE ||--o{ ENDORSEMENT_TEMPLATE : has
  ENDORSEMENT_TEMPLATE ||--o{ TEMPLATE_ROOT_FIELD : defines
  ENDORSEMENT_TEMPLATE ||--o{ TEMPLATE_DYNAMIC_FIELD : defines
  ENDORSEMENT_TEMPLATE ||--o{ TEMPLATE_EVENT : defines
  PRODUCT { int id PK; string code UK; string name }
  ENDORSEMENT_TYPE { int id PK; string code UK; string name }
  ENDORSEMENT_TEMPLATE { int id PK; int product_id FK; int endorsement_type_id FK; int version; string event_description; bool active }
  TEMPLATE_ROOT_FIELD { int id PK; int template_id FK; int sort_order; string target_path; string kind; string source_field; jsonb default_value; bool required }
  TEMPLATE_DYNAMIC_FIELD { int id PK; int template_id FK; int sort_order; string label; string source_field; jsonb default_value; bool required }
  TEMPLATE_EVENT { int id PK; int template_id FK; int order_event; string description }
```

- `template_root_field` define la estructura completa del documento del core. `target_path` admite notación
  `a.b[0].c`; las claves se generan en el orden de `sort_order`. `kind` puede ser `FIELD`, `EVENT_ENTITY`
  (genera `eventEntity` con `dynamicData`) o `APPLIED_EVENTS` (genera `eventAppliedEntities`).
- `template_dynamic_field` define las etiquetas y el orden de `dynamicData`.
- `default_value` es JSONB: admite `""`, números o `[]`. Resolución de cada campo: valor recibido → valor por
  defecto → error 422 si es `required`.
- Restricciones: una sola versión activa por producto + tipo (índice único parcial) y órdenes únicos por plantilla.

### Agregar un producto o tipo de endoso

Solo se insertan filas, sin tocar código: un `product` y/o `endorsement_type`, un `endorsement_template` y sus
campos y eventos. La migración `1764190100000-seed-rumbo-cambio-frecuencia.js` sirve de ejemplo. Para versionar
una plantilla se inserta la versión nueva y se desactiva la anterior. Las plantillas se cachean en memoria
`TEMPLATE_CACHE_TTL_MS` (60 s por defecto).

### Comandos

```bash
cd endorsement-api
npm ci
npm test                 # unitarios + integración (server.inject, sin BD)
npm run migration:run    # requiere DB_* o DATABASE_URL
```

Con Docker: `docker compose up --build endorsement-api` (aplica las migraciones al arrancar).

## Ejercicio 2 – `routes-api`

### Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/v1/routes/optimal` | JWT + scope `routes:calculate` | Ruta más corta desde la base de grúas más cercana |
| GET | `/health` | Pública | Liveness |

El JWT es el mismo que emite `endorsement-api` (`POST /api/v1/auth/token`): ambos servicios comparten
`JWT_SECRET`, `JWT_ISSUER` y `JWT_AUDIENCE`. Solo se acepta HS256; `alg: none` y tokens sin `exp` se rechazan.

Request (el campo `graph` es opcional si hay un grafo por defecto configurado con `DEFAULT_GRAPH_FILE`):

```json
{
  "accidentLocation": "San Isidro",
  "depots": ["Miraflores", "Ate"],
  "graph": { "Miraflores": { "San Isidro": 7, "Barranco": 3 }, "San Isidro": { "Miraflores": 7, "Lince": 4 } }
}
```

Response: `{ "fromDepot": "Miraflores", "to": "San Isidro", "path": ["Miraflores", "San Isidro"], "distance": 7 }`

| HTTP | `code` | Causa |
|---|---|---|
| 400 | `INVALID_PAYLOAD` | JSON inválido, campos desconocidos o distancias no numéricas |
| 400 | `INVALID_GRAPH` | Grafo vacío, distancias negativas o fuera de rango, nombres vacíos, límites excedidos |
| 400 | `UNKNOWN_NODE` | La ubicación del accidente o una base no existe en el grafo |
| 400 | `INVALID_REQUEST` | Falta `accidentLocation`, `depots` o el grafo |
| 401 / 403 | `MISSING_TOKEN`, `INVALID_TOKEN` / `INSUFFICIENT_SCOPE` | Autenticación y autorización |
| 413 | `PAYLOAD_TOO_LARGE` | Body mayor a `MAX_BODY_BYTES` (1 MB) |
| 422 | `ROUTE_UNREACHABLE` | Ninguna base alcanza el distrito del siniestro |

### Decisiones de diseño

- **Dijkstra multi-origen:** todas las bases entran a la cola de prioridad con distancia 0 y la búsqueda termina
  al alcanzar el distrito del siniestro. Una sola ejecución, `O((V + E) log V)`, resuelve a la vez la base más
  cercana y la ruta (en vez de un Dijkstra por base).
- **Grafo dirigido:** cada arista vale en el sentido declarado, lo que permite modelar vías de un solo sentido.
  Una vía de doble sentido se declara en ambos nodos, como en el ejemplo del enunciado.
- **Determinismo:** el grafo se compila a índices ordenados por nombre; en empates de distancia gana la base que
  aparece primero en `depots`.
- **Extensibilidad:** el algoritmo (`internal/graph`) no conoce HTTP ni Lima. El grafo es dato: llega en el
  request o desde un JSON (`data/lima-sample.json`, el grafo del enunciado), sin tocar código.
- **Protección:** límites de tamaño de body, nodos (`MAX_GRAPH_NODES`), aristas (`MAX_GRAPH_EDGES`) y peso máximo.

### Estructura

```
routes-api/
├── cmd/server/          composición, timeouts HTTP y apagado ordenado
├── internal/graph/      dominio: compilación del grafo y Dijkstra (sin dependencias)
├── internal/routing/    caso de uso: grafo del request o grafo por defecto
├── internal/httpapi/    transporte v1: handler, JWT por scope, CORS, logs, recover
├── internal/auth/       verificación JWT (golang-jwt/jwt v5)
├── internal/config/     configuración por variables de entorno
└── data/                grafos por defecto
```

### Comandos

```bash
cd routes-api
go test -race -cover ./...
go test -run '^$' -bench . -benchmem ./internal/graph   # ~1.2 ms en una cuadrícula de 10.000 nodos
go run ./cmd/server                                     # requiere JWT_SECRET
```

Con Docker: `docker compose up --build routes-api` (imagen `scratch` de ~10 MB, usuario sin privilegios; los
tests corren durante el build).

## Frontend

React 19 + Vite 8 con dos pestañas (Traductor de endosos y Rutas óptimas de grúas), precargadas con los ejemplos
del enunciado. El usuario obtiene un JWT con `clientId`/`clientSecret` (valores `API_CLIENT_ID` y
`API_CLIENT_SECRET` del `.env`); el token se guarda en `sessionStorage` y expira en el cliente junto con el JWT.

El navegador solo habla con su propio origen: nginx (en Docker) o el proxy de Vite (en desarrollo) reenvían
`/endorsement-api/*` y `/routes-api/*` a cada servicio, así que no se exponen URLs internas ni hace falta CORS.
nginx agrega `Content-Security-Policy`, `X-Frame-Options` y `X-Content-Type-Options`.

```bash
docker compose up -d --build      # todo el stack: http://localhost:5173
cd frontend && npm ci && npm run dev   # desarrollo, con las APIs corriendo en 3000 y 8080
npm test                               # tests del cliente HTTP
```

## Despliegue

Desplegado en **Azure Container Apps** con PostgreSQL Flexible Server:

| Servicio | URL |
|---|---|
| Frontend | https://frontend.graytree-1b59d6c6.eastus.azurecontainerapps.io |
| Endorsement API (Swagger) | https://endorsement-api.graytree-1b59d6c6.eastus.azurecontainerapps.io/documentation |
| Routes API | https://routes-api.graytree-1b59d6c6.eastus.azurecontainerapps.io |

El despliegue completo es `./deploy/azure/deploy.sh` (detalles en [`deploy/azure/README.md`](deploy/azure/README.md)).
Como alternativa queda listo GCP Cloud Run + Neon en [`deploy/gcp/README.md`](deploy/gcp/README.md).

CI en GitHub Actions (`.github/workflows/ci.yml`): tests, `go vet`, `gofmt`, `npm audit` y build de las tres
imágenes Docker en cada push y pull request.

## Nota de seguridad

El repositorio vive dentro de `htdocs` de XAMPP. El archivo `.htaccess` de la raíz bloquea el acceso web
(`Require all denied`) para que Apache no exponga código ni archivos `.env`.
