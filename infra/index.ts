import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";

const stack = pulumi.getStack();

const serverCfg = new pulumi.Config("server");

const project = gcp.config.project;
if (!project) {
	throw new pulumi.RunError(
		"Missing GCP project. Set it with: pulumi config set gcp:project <YOUR_PROJECT_ID>"
	);
}
const region = gcp.config.region ?? "us-central1";

const toId = (value: string, maxLen: number) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/^-+/, "")
		.replace(/-+$/, "")
		.slice(0, maxLen);

const services = [
	"artifactregistry.googleapis.com",
	"run.googleapis.com",
	"iam.googleapis.com",
	"sqladmin.googleapis.com",
	"aiplatform.googleapis.com",
].map(
	(api) =>
		new gcp.projects.Service(
			api.replaceAll(".", "-"),
			{
				project,
				service: api,
				disableOnDestroy: false,
			},
			{ protect: false }
		)
);

const databaseUrl = serverCfg.requireSecret("databaseUrl");
const jwtSecret = serverCfg.requireSecret("jwtSecret");
const jwtPublicKey = serverCfg.requireSecret("jwtPublicKey");
const googleClientId = serverCfg.requireSecret("googleClientId");
const googleClientSecret = serverCfg.requireSecret("googleClientSecret");
const elevenlabsWebhookSecret = serverCfg.requireSecret(
	"elevenlabsWebhookSecret"
);
const elevenlabsDefaultUserId = serverCfg.getSecret("elevenlabsDefaultUserId");
const betterAuthSecretKey = serverCfg.requireSecret("betterAuthSecretKey");

const cloudSqlConnectionName = serverCfg.require("cloudSqlConnectionName");
const authUrl = serverCfg.require("authUrl");
const frontendUrl = serverCfg.get("frontendUrl") ?? "http://localhost:5173";

const databaseHostForCloudRun = `/cloudsql/${cloudSqlConnectionName}`;

const databaseUrlForCloudRun = pulumi
	.all([databaseUrl])
	.apply(([rawDatabaseUrl]) => {
		try {
			const url = new URL(rawDatabaseUrl);
			url.searchParams.delete("host");
			url.searchParams.delete("sslmode");
			return url.toString();
		} catch {
			return rawDatabaseUrl;
		}
	});

const vertexLocation = serverCfg.get("vertexLocation") ?? region;
const vertexMiniModel = serverCfg.get("vertexMiniModel");
const vertexCounselorModel = serverCfg.get("vertexCounselorModel");
const vertexEmbeddingModel = serverCfg.get("vertexEmbeddingModel");

const repo = new gcp.artifactregistry.Repository(
	"marmaladeRepo",
	{
		location: region,
		repositoryId: toId(`marmalade-${stack}`, 60),
		format: "DOCKER",
	},
	{ dependsOn: services }
);

const clientConfig = gcp.organizations.getClientConfig({});

const registryServer = `${region}-docker.pkg.dev`;
const imageName = pulumi.interpolate`${registryServer}/${project}/${repo.repositoryId}/server:${stack}`;

const image = new docker.Image("serverImage", {
	imageName,
	build: {
		context: "..",
		dockerfile: "../server/Dockerfile",
		platform: "linux/amd64",
	},
	registry: {
		server: registryServer,
		username: "oauth2accesstoken",
		password: clientConfig.then((c: { accessToken: string }) => c.accessToken),
	},
});

const runtimeSa = new gcp.serviceaccount.Account(
	"runtimeSa",
	{
		accountId: toId(`marmalade-run-${stack}`, 28),
		displayName: `marmalade cloud run (${stack})`,
	},
	{ dependsOn: services }
);

new gcp.projects.IAMMember("runtimeSaVertexAiUser", {
	project,
	role: "roles/aiplatform.user",
	member: pulumi.interpolate`serviceAccount:${runtimeSa.email}`,
});

new gcp.projects.IAMMember("runtimeSaCloudSqlClient", {
	project,
	role: "roles/cloudsql.client",
	member: pulumi.interpolate`serviceAccount:${runtimeSa.email}`,
});

const service = new gcp.cloudrunv2.Service(
	"serverService",
	{
		location: region,
		name: toId(`marmalade-server-${stack}`, 63),
		ingress: "INGRESS_TRAFFIC_ALL",
		template: {
			serviceAccount: runtimeSa.email,
			volumes: [
				{
					name: "cloudsql",
					cloudSqlInstance: {
						instances: [cloudSqlConnectionName],
					},
				},
			],
			scaling: {
				minInstanceCount: 1,
				maxInstanceCount: 10,
			},
			containers: [
				{
					// Use the immutable digest so updates roll a new revision even if the tag stays the same.
					image: image.repoDigest,
					ports: {
						containerPort: 8080,
					},
					startupProbe: {
						httpGet: {
							path: "/",
							port: 8080,
						},
						periodSeconds: 10,
						timeoutSeconds: 10,
						failureThreshold: 12,
					},
					volumeMounts: [
						{
							name: "cloudsql",
							mountPath: "/cloudsql",
						},
					],
					envs: [
						{
							name: "AUTH_URL",
							value: authUrl,
						},
						{ name: "BASE_URL", value: authUrl },
						{ name: "FRONTEND_URL", value: frontendUrl },
						{ name: "NODE_ENV", value: "production" },
						{ name: "GOOGLE_CLOUD_PROJECT_ID", value: project },
						{ name: "VERTEX_LOCATION", value: vertexLocation },
						{ name: "VERTEX_MINI_MODEL", value: vertexMiniModel },
						{ name: "VERTEX_COUNSELOR_MODEL", value: vertexCounselorModel },
						{ name: "VERTEX_EMBEDDING_MODEL", value: vertexEmbeddingModel },
						{ name: "CLOUDSQL_CONNECTION_NAME", value: cloudSqlConnectionName },
						{ name: "DATABASE_URL", value: databaseUrlForCloudRun },
						{ name: "DATABASE_HOST", value: databaseHostForCloudRun },
						{ name: "GOOGLE_CLIENT_ID", value: googleClientId },
						{ name: "GOOGLE_CLIENT_SECRET", value: googleClientSecret },
						{ name: "BETTER_AUTH_SECRET_KEY", value: betterAuthSecretKey },
						{
							name: "ELEVENLABS_WEBHOOK_SECRET",
							value: elevenlabsWebhookSecret,
						},
						{ name: "JWT_SECRET", value: jwtSecret },
						{ name: "JWT_PUBLIC_KEY", value: jwtPublicKey },
						...(elevenlabsDefaultUserId
							? [
									{
										name: "ELEVENLABS_DEFAULT_USER_ID",
										value: elevenlabsDefaultUserId,
									},
							  ]
							: []),
					],
				},
			],
		},
	},
	{ dependsOn: services }
);

const migrateJob = new gcp.cloudrunv2.Job(
	"dbMigrateJob",
	{
		location: region,
		name: toId(`marmalade-migrate-${stack}`, 63),
		template: {
			template: {
				serviceAccount: runtimeSa.email,
				volumes: [
					{
						name: "cloudsql",
						cloudSqlInstance: {
							instances: [cloudSqlConnectionName],
						},
					},
				],
				containers: [
					{
						image: image.repoDigest,
						workingDir: "/app/server",
						commands: ["node"],
						args: ["dist/migrate.db.js"],
						volumeMounts: [
							{
								name: "cloudsql",
								mountPath: "/cloudsql",
							},
						],
						envs: [
							{ name: "BASE_URL", value: authUrl },
							{ name: "FRONTEND_URL", value: frontendUrl },
							{ name: "NODE_ENV", value: "production" },
							{ name: "GOOGLE_CLOUD_PROJECT_ID", value: project },
							{ name: "VERTEX_LOCATION", value: vertexLocation },
							{ name: "VERTEX_MINI_MODEL", value: vertexMiniModel },
							{ name: "VERTEX_COUNSELOR_MODEL", value: vertexCounselorModel },
							{ name: "VERTEX_EMBEDDING_MODEL", value: vertexEmbeddingModel },
							{
								name: "CLOUDSQL_CONNECTION_NAME",
								value: cloudSqlConnectionName,
							},
							{ name: "DATABASE_URL", value: databaseUrlForCloudRun },
							{ name: "DATABASE_HOST", value: databaseHostForCloudRun },
							{ name: "GOOGLE_CLIENT_ID", value: googleClientId },
							{ name: "GOOGLE_CLIENT_SECRET", value: googleClientSecret },
							{ name: "BETTER_AUTH_SECRET_KEY", value: betterAuthSecretKey },
							{
								name: "ELEVENLABS_WEBHOOK_SECRET",
								value: elevenlabsWebhookSecret,
							},
							{ name: "JWT_SECRET", value: jwtSecret },
							{ name: "JWT_PUBLIC_KEY", value: jwtPublicKey },
							...(elevenlabsDefaultUserId
								? [
										{
											name: "ELEVENLABS_DEFAULT_USER_ID",
											value: elevenlabsDefaultUserId,
										},
								  ]
								: []),
						],
					},
				],
			},
		},
	},
	{ dependsOn: services }
);

const kbSeedJob = new gcp.cloudrunv2.Job(
	"kbSeedJob",
	{
		location: region,
		name: toId(`marmalade-kb-seed-${stack}`, 63),
		template: {
			template: {
				serviceAccount: runtimeSa.email,
				volumes: [
					{
						name: "cloudsql",
						cloudSqlInstance: {
							instances: [cloudSqlConnectionName],
						},
					},
				],
				containers: [
					{
						image: image.repoDigest,
						workingDir: "/app/server",
						commands: ["node"],
						args: ["dist/kb-seed.js"],
						volumeMounts: [
							{
								name: "cloudsql",
								mountPath: "/cloudsql",
							},
						],
						envs: [
							{ name: "BASE_URL", value: authUrl },
							{ name: "FRONTEND_URL", value: frontendUrl },
							{ name: "NODE_ENV", value: "production" },
							{ name: "GOOGLE_CLOUD_PROJECT_ID", value: project },
							{ name: "VERTEX_LOCATION", value: vertexLocation },
							{ name: "VERTEX_MINI_MODEL", value: vertexMiniModel },
							{ name: "VERTEX_COUNSELOR_MODEL", value: vertexCounselorModel },
							{ name: "VERTEX_EMBEDDING_MODEL", value: vertexEmbeddingModel },
							{
								name: "CLOUDSQL_CONNECTION_NAME",
								value: cloudSqlConnectionName,
							},
							{ name: "DATABASE_URL", value: databaseUrlForCloudRun },
							{ name: "DATABASE_HOST", value: databaseHostForCloudRun },
							{ name: "GOOGLE_CLIENT_ID", value: googleClientId },
							{ name: "GOOGLE_CLIENT_SECRET", value: googleClientSecret },
							{ name: "BETTER_AUTH_SECRET_KEY", value: betterAuthSecretKey },
							{
								name: "ELEVENLABS_WEBHOOK_SECRET",
								value: elevenlabsWebhookSecret,
							},
							{ name: "JWT_SECRET", value: jwtSecret },
							{ name: "JWT_PUBLIC_KEY", value: jwtPublicKey },
							...(elevenlabsDefaultUserId
								? [
										{
											name: "ELEVENLABS_DEFAULT_USER_ID",
											value: elevenlabsDefaultUserId,
										},
								  ]
								: []),
						],
					},
				],
			},
		},
	},
	{ dependsOn: services }
);

new gcp.cloudrunv2.ServiceIamMember("publicInvoker", {
	name: service.name,
	location: service.location,
	role: "roles/run.invoker",
	member: "allUsers",
});

export const url = service.uri;
export const migrateJobName = migrateJob.name;
export const kbSeedJobName = kbSeedJob.name;
