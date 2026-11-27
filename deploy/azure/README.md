# Despliegue en Azure Container Apps

```bash
az login
./deploy/azure/deploy.sh
```

El script es idempotente: la primera vez genera nombres y secretos en `deploy/azure/.env.azure` (ignorado por git,
permisos `600`) y en las siguientes ejecuciones construye imágenes nuevas y actualiza las apps.

| Recurso | Servicio | Costo aproximado |
|---|---|---|
| `rg-interseguritos` | Grupo de recursos | – |
| `endorsement-api`, `routes-api`, `frontend` | Container Apps (escala a 0, máx. 2 réplicas) | Dentro de la cuota gratuita mensual |
| Registro de imágenes | Azure Container Registry Basic | ~5 USD/mes |
| PostgreSQL 17 | Flexible Server Burstable B1ms, 32 GB (`centralus`) | ~16 USD/mes |
| Logs | Log Analytics | Céntimos con este volumen |

Variables opcionales: `LOCATION` (apps, por defecto `eastus`), `PG_LOCATION` (base, por defecto `centralus`, porque
Burstable suele estar restringido o sin capacidad en `eastus`/`eastus2`), `RG`, `ENV_NAME`, `JWT_ISSUER`,
`JWT_AUDIENCE`, `API_CLIENT_ID`.

## Acceso

El script imprime las URLs. Para entrar al frontend, el *client secret* es `API_CLIENT_SECRET` de
`deploy/azure/.env.azure`. Las migraciones y la plantilla del enunciado se aplican al arrancar `endorsement-api`.

## Seguridad

- Secretos (cadena de conexión, `JWT_SECRET`, *client secret*) como secretos de Container Apps, referenciados con
  `secretref:`; nunca en texto plano en la configuración.
- Imágenes descargadas con identidad administrada (`AcrPull`), sin usuario admin del registro.
- PostgreSQL exige TLS y el cliente verifica el certificado (`DB_SSL=true`).
- Para producción: VNet con acceso privado a PostgreSQL en lugar de la regla "permitir servicios de Azure", y Key
  Vault para rotación de secretos.

## Eliminar todo

```bash
az group delete -n rg-interseguritos --yes --no-wait
```
