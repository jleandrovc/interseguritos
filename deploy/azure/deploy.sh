#!/usr/bin/env bash
# Deploys PostgreSQL Flexible Server + the three services to Azure Container Apps.
# Idempotent: generated names and secrets are kept in deploy/azure/.env.azure (gitignored) and reused.
set -euo pipefail

LOCATION="${LOCATION:-eastus}"
# Burstable PostgreSQL Flexible Server is restricted or out of capacity in eastus/eastus2 for many subscriptions.
PG_LOCATION="${PG_LOCATION:-centralus}"
RG="${RG:-rg-interseguritos}"
ENV_NAME="${ENV_NAME:-env-interseguritos}"
JWT_ISSUER="${JWT_ISSUER:-interseguritos}"
JWT_AUDIENCE="${JWT_AUDIENCE:-interseguritos-apis}"
API_CLIENT_ID="${API_CLIENT_ID:-frontend}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_FILE="$ROOT/deploy/azure/.env.azure"

if [[ ! -f "$STATE_FILE" ]]; then
  suffix="$(openssl rand -hex 3)"
  umask 077
  cat >"$STATE_FILE" <<EOF
ACR_NAME=interseguritos${suffix}
PG_SERVER=pg-interseguritos-${suffix}
PG_ADMIN=interseguritos
PG_PASSWORD=Aa1$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
API_CLIENT_SECRET=$(openssl rand -hex 16)
EOF
fi
# shellcheck source=/dev/null
source "$STATE_FILE"

log() { printf '\n==> %s\n' "$*"; }

log "Resource group, registry and Container Apps environment"
az provider register -n Microsoft.DBforPostgreSQL --wait >/dev/null
az provider register -n Microsoft.OperationalInsights --wait >/dev/null
az group create -n "$RG" -l "$LOCATION" -o none
az acr show -n "$ACR_NAME" -g "$RG" -o none 2>/dev/null ||
  az acr create -n "$ACR_NAME" -g "$RG" --sku Basic -o none
az containerapp env show -n "$ENV_NAME" -g "$RG" -o none 2>/dev/null ||
  az containerapp env create -n "$ENV_NAME" -g "$RG" -l "$LOCATION" -o none

DOMAIN="$(az containerapp env show -n "$ENV_NAME" -g "$RG" --query properties.defaultDomain -o tsv)"
ENDORSEMENT_URL="https://endorsement-api.${DOMAIN}"
ROUTES_URL="https://routes-api.${DOMAIN}"
FRONTEND_URL="https://frontend.${DOMAIN}"

log "PostgreSQL Flexible Server ($PG_SERVER)"
if ! az postgres flexible-server show -n "$PG_SERVER" -g "$RG" -o none 2>/dev/null; then
  az postgres flexible-server create -n "$PG_SERVER" -g "$RG" -l "$PG_LOCATION" \
    --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 17 \
    --admin-user "$PG_ADMIN" --admin-password "$PG_PASSWORD" \
    --public-access 0.0.0.0 --yes -o none
fi
az postgres flexible-server db show --server-name "$PG_SERVER" -g "$RG" --name endorsements -o none 2>/dev/null ||
  az postgres flexible-server db create --server-name "$PG_SERVER" -g "$RG" --name endorsements -o none
DATABASE_URL="postgresql://${PG_ADMIN}:${PG_PASSWORD}@${PG_SERVER}.postgres.database.azure.com:5432/endorsements"

log "Building images in ACR"
TAG="$(date +%Y%m%d%H%M%S)"
for svc in endorsement-api routes-api frontend; do
  az acr build -r "$ACR_NAME" -t "${svc}:${TAG}" "$ROOT/$svc" --no-logs -o none
done
REGISTRY="${ACR_NAME}.azurecr.io"

# deploy_app <name> <port> <secrets> <env-vars...>
deploy_app() {
  local name="$1" port="$2" secrets="$3"
  shift 3
  if az containerapp show -n "$name" -g "$RG" -o none 2>/dev/null; then
    # shellcheck disable=SC2086
    [[ -n "$secrets" ]] && az containerapp secret set -n "$name" -g "$RG" --secrets $secrets -o none
    az containerapp update -n "$name" -g "$RG" --image "${REGISTRY}/${name}:${TAG}" \
      --set-env-vars "$@" -o none
  else
    local secret_args=()
    # shellcheck disable=SC2206
    [[ -n "$secrets" ]] && secret_args=(--secrets $secrets)
    az containerapp create -n "$name" -g "$RG" --environment "$ENV_NAME" \
      --image "${REGISTRY}/${name}:${TAG}" --registry-server "$REGISTRY" --registry-identity system \
      --ingress external --target-port "$port" --min-replicas 0 --max-replicas 2 \
      --cpu 0.5 --memory 1.0Gi ${secret_args[@]+"${secret_args[@]}"} --env-vars "$@" -o none
  fi
}

log "Deploying endorsement-api"
deploy_app endorsement-api 3000 \
  "database-url=${DATABASE_URL} jwt-secret=${JWT_SECRET} client-secret=${API_CLIENT_SECRET}" \
  NODE_ENV=production PORT=3000 DB_SSL=true DB_MIGRATIONS_RUN=true \
  DATABASE_URL=secretref:database-url JWT_SECRET=secretref:jwt-secret API_CLIENT_SECRET=secretref:client-secret \
  JWT_ISSUER="$JWT_ISSUER" JWT_AUDIENCE="$JWT_AUDIENCE" API_CLIENT_ID="$API_CLIENT_ID" CORS_ORIGINS="$FRONTEND_URL"

log "Deploying routes-api"
deploy_app routes-api 8080 "jwt-secret=${JWT_SECRET}" \
  PORT=8080 JWT_SECRET=secretref:jwt-secret JWT_ISSUER="$JWT_ISSUER" JWT_AUDIENCE="$JWT_AUDIENCE" \
  CORS_ORIGINS="$FRONTEND_URL"

log "Deploying frontend"
deploy_app frontend 8080 "" \
  PORT=8080 ENDORSEMENT_API_URL="$ENDORSEMENT_URL" ROUTES_API_URL="$ROUTES_URL"

echo
echo "Frontend:        ${FRONTEND_URL}"
echo "Endorsement API: ${ENDORSEMENT_URL}  (Swagger: ${ENDORSEMENT_URL}/documentation)"
echo "Routes API:      ${ROUTES_URL}"
echo "Client secret:   API_CLIENT_SECRET in deploy/azure/.env.azure"
