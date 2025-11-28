import { serve } from "@hono/node-server";
import { createApp } from "./server";

const app = createApp();

serve({ fetch: app.fetch, port: 3000 });

console.log(`Dev server on http://localhost:3000`);
