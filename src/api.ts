export type OfferStatus = "idle" | "sent" | "accepted" | "declined"

export type AppData = {
  offer: {
    id: string
    status: OfferStatus
    sentAt: string | null
    respondedAt: string | null
  }
  playground: {
    constraintIntroduced: boolean
    revision: number
    saved: boolean
    updatedAt: string | null
  }
  interviews: Array<{
    id: string
    transcribing?: boolean
    status: string
  }>
  notes: Array<{
    id: string
    interviewId: string
    text: string
    createdAt: string
  }>
  analytics: { slotsRescued: number }
}

type ApiErrorBody = { error?: { message?: string } }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
  })
  const payload = (await response.json()) as T & ApiErrorBody
  if (!response.ok)
    throw new Error(
      payload.error?.message || `Request failed (${response.status})`,
    )
  return payload
}

export const api = {
  bootstrap: () => request<AppData>("/api/bootstrap"),
  setTranscription: (active: boolean) =>
    request<{ transcribing: boolean }>(
      "/api/interviews/maya-live/transcription",
      { method: "PATCH", body: JSON.stringify({ active }) },
    ),
  addNote: (text: string) =>
    request<AppData["notes"][number]>("/api/interviews/maya-live/notes", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  introduceConstraint: () =>
    request<AppData["playground"]>("/api/playground/constraint", {
      method: "POST",
    }),
  savePlayground: () =>
    request<AppData["playground"]>("/api/playground/save", { method: "POST" }),
  sendOffer: () =>
    request<AppData["offer"]>("/api/offers/offer-elena/send", {
      method: "POST",
    }),
  acceptOffer: () =>
    request<AppData>("/api/offers/offer-elena/accept", { method: "POST" }),
  declineOffer: () =>
    request<AppData["offer"]>("/api/offers/offer-elena/decline", {
      method: "POST",
    }),
  queue: (action: "check-in" | "join" | "leave") =>
    request<{ queueStatus: string }>(`/api/candidates/maya/queue/${action}`, {
      method: "POST",
    }),
}
