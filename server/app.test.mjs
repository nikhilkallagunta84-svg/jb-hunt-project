import assert from "node:assert/strict"
import { createServer } from "node:http"
import { after, before, beforeEach, test } from "node:test"
import { createApp } from "./app.mjs"
import { createStore } from "./store.mjs"

const store = createStore(null)
let server
let baseUrl

before(async () => {
  await store.init()
  server = createServer(createApp(store, { serveStatic: false }))
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
beforeEach(() => store.reset())
after(() => new Promise((resolve) => server.close(resolve)))

const request = async (path, options) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
  })
  return { status: response.status, body: await response.json() }
}

test("health and bootstrap expose the complete initial state", async () => {
  const health = await request("/api/health")
  assert.equal(health.status, 200)
  assert.equal(health.body.status, "ok")
  const result = await request("/api/bootstrap")
  assert.equal(result.status, 200)
  assert.equal(result.body.offer.status, "idle")
  assert.equal(result.body.analytics.slotsRescued, 18)
})

test("slot rescue sends and atomically accepts an offer", async () => {
  assert.equal(
    (await request("/api/offers/offer-elena/send", { method: "POST" })).body
      .status,
    "sent",
  )
  const accepted = await request("/api/offers/offer-elena/accept", {
    method: "POST",
  })
  assert.equal(accepted.status, 200)
  assert.equal(accepted.body.offer.status, "accepted")
  assert.equal(accepted.body.slot.status, "booked")
  assert.equal(accepted.body.analytics.slotsRescued, 19)
  assert.equal(
    accepted.body.interviews.find((item) => item.id === "elena-original")
      .status,
    "released",
  )
  assert.equal(
    accepted.body.interviews.find((item) => item.id === "elena-rescued").status,
    "confirmed",
  )
})

test("an offer cannot be accepted before it is sent", async () => {
  const result = await request("/api/offers/offer-elena/accept", {
    method: "POST",
  })
  assert.equal(result.status, 409)
  assert.equal(result.body.error.code, "OFFER_NOT_ACTIVE")
})

test("candidate queue lifecycle is validated", async () => {
  const early = await request("/api/candidates/elena/queue/join", {
    method: "POST",
  })
  assert.equal(early.status, 409)
  assert.equal(
    (await request("/api/candidates/elena/queue/check-in", { method: "POST" }))
      .body.queueStatus,
    "checked_in",
  )
  assert.equal(
    (await request("/api/candidates/elena/queue/join", { method: "POST" })).body
      .queueStatus,
    "waiting",
  )
  assert.equal(
    (await request("/api/candidates/elena/queue/leave", { method: "POST" }))
      .body.queueStatus,
    "left",
  )
})

test("interview transcription, notes, and playground state persist", async () => {
  const transcription = await request(
    "/api/interviews/maya-live/transcription",
    { method: "PATCH", body: JSON.stringify({ active: false }) },
  )
  assert.equal(transcription.body.transcribing, false)
  const note = await request("/api/interviews/maya-live/notes", {
    method: "POST",
    body: JSON.stringify({ text: "Clear systems thinking." }),
  })
  assert.equal(note.status, 201)
  assert.equal(note.body.text, "Clear systems thinking.")
  assert.equal(
    (await request("/api/playground/constraint", { method: "POST" })).body
      .revision,
    2,
  )
  assert.equal(
    (await request("/api/playground/save", { method: "POST" })).body.saved,
    true,
  )
})

test("invalid input and unknown resources return structured errors", async () => {
  const invalid = await request("/api/interviews/maya-live/notes", {
    method: "POST",
    body: JSON.stringify({ text: "" }),
  })
  assert.equal(invalid.status, 400)
  assert.equal(invalid.body.error.code, "VALIDATION_ERROR")
  const missing = await request("/api/nope")
  assert.equal(missing.status, 404)
  assert.equal(missing.body.error.code, "NOT_FOUND")
})
