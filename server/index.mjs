import { createServer } from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createApp } from "./app.mjs"
import { createStore } from "./store.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.API_PORT || process.env.PORT || 8787)
const dataFile =
  process.env.DATA_FILE || path.join(__dirname, "data", "talentiq.json")
const store = createStore(dataFile)
await store.init()

const server = createServer(createApp(store))
server.listen(port, "0.0.0.0", () =>
  console.log(`TalentIQ API listening on http://localhost:${port}`),
)

const shutdown = () => server.close(() => process.exit(0))
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
