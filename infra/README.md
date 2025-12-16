# Marmalade Infra (Pulumi)

This deploys the backend (`server/`) to **GCP Cloud Run**.

## Prereqs

- Pulumi CLI installed
- GCP project selected and authenticated
  - `gcloud auth application-default login`
  - `gcloud config set project <YOUR_PROJECT>`

## Configure

Set GCP defaults (Pulumi uses these):

- `pulumi config set gcp:project <YOUR_PROJECT_ID>`
- `pulumi config set gcp:region us-central1`

Set required server env vars (mark secrets as secret):

- `pulumi config set server:cloudSqlConnectionName "<PROJECT_ID>:us-central1:<INSTANCE_NAME>"`

- `pulumi config set --secret server:databaseUrl "..."`
- `pulumi config set --secret server:jwtSecret "..."`
- `pulumi config set --secret server:jwtPublicKey "..."`
- `pulumi config set --secret server:googleClientId "..."`
- `pulumi config set --secret server:googleClientSecret "..."`
- `pulumi config set --secret server:elevenlabsWebhookSecret "..."`

Optional:

- `pulumi config set --secret server:elevenlabsDefaultUserId "<uuid>"` << default user for ElevenLabs webhooks

## Deploy

From repo root:

- `pnpm infra:up`

Or from `infra/`:

- `pnpm install`
- `pnpm up`

After deployment, Pulumi exports the Cloud Run URL.

## Notes

- Database provisioning/migrations are not handled here; set `DATABASE_URL` to an existing Postgres.
- For Cloud Run + Cloud SQL connector, use the Unix socket format (recommended):
  - `postgresql://USER:PASSWORD@/DB_NAME?host=/cloudsql/`<PROJECT_ID>:us-central1:<INSTANCE_NAME>`
- Cloud Run authenticates to Vertex AI via its runtime service account (ADC). No JSON key file is required.
