# Despliegue en GCP Cloud Run + Neon

| Componente | Servicio | Costo en uso de demo |
|---|---|---|
| `endorsement-api`, `routes-api`, `frontend` | Cloud Run (escala a 0) | Capa gratuita de Cloud Run |
| PostgreSQL | Neon (plan Free) | Gratis |
| Imágenes | Cloud Build + Artifact Registry | Capa gratuita / céntimos por almacenamiento |
| Secretos | Secret Manager | Capa gratuita |

Cloud Run exige una cuenta de facturación activa aunque el consumo quede dentro de la capa gratuita.

## 1. Base de datos en Neon

1. Crear un proyecto en [neon.tech](https://neon.tech) y una base `endorsements`.
2. Copiar la connection string (formato `postgresql://usuario:clave@host/endorsements?sslmode=require`).
   Las migraciones y el seed se aplican solos al primer arranque (`DB_MIGRATIONS_RUN=true`).

## 2. Secretos (una sola vez)

```bash
gcloud config set project <PROJECT_ID>
gcloud services enable secretmanager.googleapis.com
printf '%s' '<connection string de Neon>' | gcloud secrets create database-url --data-file=-
openssl rand -hex 32 | tr -d '\n' | gcloud secrets create jwt-secret --data-file=-
openssl rand -hex 16 | tr -d '\n' | gcloud secrets create api-client-secret --data-file=-
```

Para entrar al frontend desplegado: `gcloud secrets versions access latest --secret=api-client-secret`.

## 3. Desplegar

```bash
PROJECT_ID=<PROJECT_ID> REGION=us-central1 ./deploy/gcp/deploy.sh
```

El script construye cada `Dockerfile` con Cloud Build, despliega los tres servicios y configura el frontend con las
URLs de las APIs. Al final imprime las URLs públicas.

## Seguridad del despliegue

- Las APIs son públicas a nivel de red, pero todos los endpoints de negocio exigen JWT con scope (requisito del reto).
- Los secretos se inyectan desde Secret Manager; no hay credenciales en imágenes ni variables en texto plano.
- El frontend llama a las APIs a través de su propio nginx, así que el navegador nunca necesita CORS.
