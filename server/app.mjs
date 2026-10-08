import { createReadStream } from "node:fs"
import { access } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, "../dist")

class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

const requireText = (value, field, max = 500) => {
  if (typeof value !== "string" || !value.trim())
    throw new ApiError(400, "VALIDATION_ERROR", `${field} is required`)
  if (value.trim().length > max)
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      `${field} must be ${max} characters or fewer`,
    )
  return value.trim()
}

async function body(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 1_000_000)
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large")
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON")
  }
}

const send = (res, status, payload) => {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  res.end(JSON.stringify(payload))
}

const analytics = (state) => {
  const accepted = state.offer.status === "accepted" ? 1 : 0
  return {
    averageWaitSeconds: state.baseline.averageWaitSeconds,
    slotsRescued: state.baseline.slotsRescued + accepted,
    completedToday: state.baseline.completedToday,
    waitTimeReducedDays: 1.4,
    offerAcceptancePercent: Math.round(
      ((state.baseline.offersAccepted + accepted) /
        (state.baseline.offersSent + (state.offer.status === "idle" ? 0 : 1))) *
        100,
    ),
    messagesAvoided: state.baseline.messagesAvoided,
    eligibleCancellationPercent: Math.round(
      ((state.baseline.slotsRescued + accepted) /
        state.baseline.eligibleCancellations) *
        100,
    ),
    recoveryMomentum: [31, 48, 44, 62, 57, 78, 69, 85, 74, 95, 82, 100],
  }
}

const bootstrap = (state) => ({ ...state, analytics: analytics(state) })

export function createApp(store, { serveStatic = true } = {}) {
  return async function app(req, res) {
    try {
      const url = new URL(req.url, "http://localhost")
      const route = `${req.method} ${url.pathname}`

      if (route === "GET /api/health")
        return send(res, 200, { status: "ok", service: "talentiq-api" })
      if (route === "GET /api/bootstrap")
        return send(res, 200, bootstrap(store.read()))
      if (route === "GET /api/analytics")
        return send(res, 200, analytics(store.read()))

      let match = url.pathname.match(
        /^\/api\/interviews\/([^/]+)\/transcription$/,
      )
      if (req.method === "PATCH" && match) {
        const input = await body(req)
        if (typeof input.active !== "boolean")
          throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "active must be a boolean",
          )
        const interview = await store.update((state) => {
          const item = state.interviews.find(({ id }) => id === match[1])
          if (!item) throw new ApiError(404, "NOT_FOUND", "Interview not found")
          item.transcribing = input.active
          state.activity.push({
            type: "transcription.changed",
            interviewId: item.id,
            active: input.active,
            at: new Date().toISOString(),
          })
          return item
        })
        return send(res, 200, interview)
      }

      match = url.pathname.match(/^\/api\/interviews\/([^/]+)\/notes$/)
      if (req.method === "POST" && match) {
        const input = await body(req)
        const note = await store.update((state) => {
          if (!state.interviews.some(({ id }) => id === match[1]))
            throw new ApiError(404, "NOT_FOUND", "Interview not found")
          const item = {
            id: `n-${Date.now()}`,
            interviewId: match[1],
            text: requireText(input.text, "text"),
            createdAt: new Date().toISOString(),
          }
          state.notes.push(item)
          return item
        })
        return send(res, 201, note)
      }

      if (route === "POST /api/playground/constraint") {
        const session = await store.update((state) => {
          state.playground.constraintIntroduced = true
          state.playground.revision += 1
          state.playground.saved = false
          state.playground.updatedAt = new Date().toISOString()
          return state.playground
        })
        return send(res, 200, session)
      }
      if (route === "POST /api/playground/save") {
        const session = await store.update((state) => {
          state.playground.saved = true
          state.playground.updatedAt = new Date().toISOString()
          return state.playground
        })
        return send(res, 200, session)
      }

      if (route === "POST /api/offers/offer-elena/send") {
        const offer = await store.update((state) => {
          if (state.slot.status !== "open")
            throw new ApiError(
              409,
              "SLOT_UNAVAILABLE",
              "The slot is no longer available",
            )
          if (["idle", "declined"].includes(state.offer.status)) {
            state.offer.status = "sent"
            state.offer.sentAt = new Date().toISOString()
            state.slot.status = "held"
          }
          return state.offer
        })
        return send(res, 200, offer)
      }
      if (route === "POST /api/offers/offer-elena/accept") {
        const result = await store.update((state) => {
          if (state.offer.status === "accepted") return bootstrap(state)
          if (state.offer.status !== "sent" || state.slot.status !== "held")
            throw new ApiError(
              409,
              "OFFER_NOT_ACTIVE",
              "This offer cannot be accepted",
            )
          state.offer.status = "accepted"
          state.offer.respondedAt = new Date().toISOString()
          state.slot.status = "booked"
          const original = state.interviews.find(
            ({ id }) => id === "elena-original",
          )
          original.status = "released"
          state.interviews.push({
            id: "elena-rescued",
            candidateId: "elena",
            candidateName: "Elena Garcia",
            startsAt: state.slot.startsAt,
            durationMinutes: 45,
            type: "Follow-up",
            status: "confirmed",
          })
          state.activity.push({
            type: "slot.rescued",
            candidateId: "elena",
            slotId: state.slot.id,
            at: state.offer.respondedAt,
          })
          return bootstrap(state)
        })
        return send(res, 200, result)
      }
      if (route === "POST /api/offers/offer-elena/decline") {
        const offer = await store.update((state) => {
          if (state.offer.status !== "sent")
            throw new ApiError(
              409,
              "OFFER_NOT_ACTIVE",
              "This offer cannot be declined",
            )
          state.offer.status = "declined"
          state.offer.respondedAt = new Date().toISOString()
          state.slot.status = "open"
          return state.offer
        })
        return send(res, 200, offer)
      }

      match = url.pathname.match(
        /^\/api\/candidates\/([^/]+)\/queue\/(check-in|join|leave)$/,
      )
      if (req.method === "POST" && match) {
        const [, candidateId, action] = match
        const candidate = await store.update((state) => {
          const item = state.candidates.find(({ id }) => id === candidateId)
          if (!item) throw new ApiError(404, "NOT_FOUND", "Candidate not found")
          if (action === "check-in") item.queueStatus = "checked_in"
          if (action === "join") {
            if (!["checked_in", "waiting"].includes(item.queueStatus))
              throw new ApiError(
                409,
                "NOT_CHECKED_IN",
                "Candidate must check in before joining",
              )
            item.queueStatus = "waiting"
            item.queuePosition = 1
            item.estimatedWaitMinutes = 6
          }
          if (action === "leave") {
            item.queueStatus = "left"
            item.queuePosition = null
            item.estimatedWaitMinutes = null
          }
          return item
        })
        return send(res, 200, candidate)
      }

      if (url.pathname.startsWith("/api/"))
        throw new ApiError(404, "NOT_FOUND", "API route not found")
      if (!serveStatic || !["GET", "HEAD"].includes(req.method))
        throw new ApiError(404, "NOT_FOUND", "Route not found")

      const requested =
        url.pathname === "/" ? "index.html" : url.pathname.slice(1)
      let file = path.resolve(distDir, requested)
      if (!file.startsWith(distDir))
        throw new ApiError(403, "FORBIDDEN", "Invalid path")
      try {
        await access(file)
      } catch {
        file = path.join(distDir, "index.html")
      }
      const extensions = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
      }
      res.writeHead(200, {
        "content-type":
          extensions[path.extname(file)] || "application/octet-stream",
      })
      if (req.method === "HEAD") return res.end()
      createReadStream(file).pipe(res)
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500
      if (status === 500) console.error(error)
      send(res, status, {
        error: {
          code: error.code || "INTERNAL_ERROR",
          message:
            status === 500 ? "An unexpected error occurred" : error.message,
        },
      })
    }
  }
}
