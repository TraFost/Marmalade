import { serve } from "@hono/node-server";

import { createApp } from "./server";
import { env } from "./configs/env.config";

const app = createApp();

serve({ fetch: app.fetch, port: env.PORT });

console.log(`Dev server on http://localhost:${env.PORT}`);
