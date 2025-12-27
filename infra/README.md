# Marmalade Infra (Pulumi)

This Pulumi project builds and deploys Marmalade services (server and client) to **GCP Cloud Run** and manages Artifact Registry images.

## Prereqs

- Pulumi CLI installed and authenticated
- GCP project selected and authenticated:
  - `gcloud auth application-default login`
  - `gcloud config set project <YOUR_PROJECT>`
- Node & pnpm installed

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
- `pulumi config set --secret elevenLabsAgentId "<agent-id>"`

Optional:

- `pulumi config set --secret server:elevenlabsDefaultUserId "<uuid>"` — default user for ElevenLabs webhooks

## Deploy

From repo root:

- `pnpm infra:up` (wrapped helper)

Or from `infra/`:

- `pnpm install`
- `pnpm up`

Pulumi will build images for `server` and `client` (Artifact Registry) and create Cloud Run services. After deployment, Pulumi prints service URLs.

## Notes & suggestions

- Migrations: the infra project does not run migrations automatically. After deploying, run `pnpm -C server db:migrate` against the deployed DB as needed.
- Client: a `client/Dockerfile` and `nginx.conf` are included to build the static site image.
- IAM: the infra creates an Artifact Registry and assigns access to the Cloud Run service account; ensure your service account has the correct permissions for Vertex/Cloud SQL.
- Secrets: Use Pulumi secrets for private keys & tokens (do not commit them).

## Troubleshooting

- If Pulumi TypeScript fails to compile, run `pnpm -C infra build` to see errors locally.
- To debug container builds, run the Dockerfile locally with `docker build` and `docker run`.

---

For more details, see `infra/index.ts` and the `docs/` folder.
