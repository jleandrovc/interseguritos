#!/usr/bin/env bash
# Deploys the three services to Cloud Run (builds from each Dockerfile with Cloud Build).
# Prerequisites: gcloud authenticated, billing enabled, and the secrets described in deploy/gcp/README.md.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-us-central1}"
JWT_ISSUER="${JWT_ISSUER:-interseguritos}"
JWT_AUDIENCE="${JWT_AUDIENCE:-interseguritos-apis}"
API_CLIENT_ID="${API_CLIENT_ID:-frontend}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
for secret in database-url jwt-secret api-client-secret; do
  gcloud secrets add-iam-policy-binding "$secret" --member="serviceAccount:${RUNTIME_SA}" \
    --role=roles/secretmanager.secretAccessor >/dev/null
done

common=(--region "$REGION" --allow-unauthenticated --min-instances 0 --max-instances 2 --quiet)

gcloud run deploy endorsement-api --source "$ROOT/endorsement-api" "${common[@]}" \
  --memory 512Mi \
  --set-env-vars "NODE_ENV=production,DB_SSL=true,DB_MIGRATIONS_RUN=true,JWT_ISSUER=${JWT_ISSUER},JWT_AUDIENCE=${JWT_AUDIENCE},API_CLIENT_ID=${API_CLIENT_ID}" \
  --set-secrets "DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,API_CLIENT_SECRET=api-client-secret:latest"

gcloud run deploy routes-api --source "$ROOT/routes-api" "${common[@]}" \
  --memory 256Mi \
  --set-env-vars "JWT_ISSUER=${JWT_ISSUER},JWT_AUDIENCE=${JWT_AUDIENCE}" \
  --set-secrets "JWT_SECRET=jwt-secret:latest"

ENDORSEMENT_URL="$(gcloud run services describe endorsement-api --region "$REGION" --format='value(status.url)')"
ROUTES_URL="$(gcloud run services describe routes-api --region "$REGION" --format='value(status.url)')"

gcloud run deploy frontend --source "$ROOT/frontend" "${common[@]}" \
  --memory 256Mi \
  --set-env-vars "ENDORSEMENT_API_URL=${ENDORSEMENT_URL},ROUTES_API_URL=${ROUTES_URL}"

FRONTEND_URL="$(gcloud run services describe frontend --region "$REGION" --format='value(status.url)')"
echo
echo "Frontend:        ${FRONTEND_URL}"
echo "Endorsement API: ${ENDORSEMENT_URL}  (Swagger: ${ENDORSEMENT_URL}/documentation)"
echo "Routes API:      ${ROUTES_URL}"
