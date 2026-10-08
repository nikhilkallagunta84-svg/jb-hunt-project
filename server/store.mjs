import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

const initialState = () => ({
  version: 1,
  candidates: [
    {
      id: "maya",
      name: "Maya Thompson",
      initials: "MT",
      role: "Operations Analyst",
      queueStatus: "waiting",
      queuePosition: 1,
      estimatedWaitMinutes: 6,
      optedInToRescue: true,
    },
    {
      id: "elena",
      name: "Elena Garcia",
      initials: "EG",
      role: "Operations Analyst",
      queueStatus: "not_joined",
      queuePosition: null,
      estimatedWaitMinutes: null,
      optedInToRescue: true,
    },
    {
      id: "jordan",
      name: "Jordan Lee",
      initials: "JL",
      role: "Operations Analyst",
      queueStatus: "waiting",
      queuePosition: 2,
      estimatedWaitMinutes: 12,
      optedInToRescue: false,
    },
  ],
  interviews: [
    {
      id: "noah-review",
      candidateId: "noah",
      candidateName: "Noah Williams",
      startsAt: "2024-10-18T13:00:00-05:00",
      durationMinutes: 45,
      type: "Follow-up",
      status: "completed",
    },
    {
      id: "maya-live",
      candidateId: "maya",
      candidateName: "Maya Thompson",
      startsAt: "2024-10-18T14:00:00-05:00",
      durationMinutes: 45,
      type: "Follow-up",
      status: "live",
      transcribing: true,
    },
    {
      id: "elena-original",
      candidateId: "elena",
      candidateName: "Elena Garcia",
      startsAt: "2024-10-19T10:00:00-05:00",
      durationMinutes: 45,
      type: "Follow-up",
      status: "confirmed",
    },
  ],
  transcript: [
    {
      id: "t1",
      interviewId: "maya-live",
      speaker: "Alex",
      role: "interviewer",
      timestamp: "10:04:12",
      text: "Tell me how you decide what needs attention first when the information is incomplete.",
      insight: false,
    },
    {
      id: "t2",
      interviewId: "maya-live",
      speaker: "Maya",
      role: "candidate",
      timestamp: "10:04:30",
      text: "I start with customer impact, then whether there\u2019s a clear action the team can take right now.",
      insight: false,
    },
    {
      id: "t3",
      interviewId: "maya-live",
      speaker: "Alex",
      role: "interviewer",
      timestamp: "10:05:04",
      text: "What could make that decision easier for a dispatcher?",
      insight: false,
    },
    {
      id: "t4",
      interviewId: "maya-live",
      speaker: "Maya",
      role: "candidate",
      timestamp: "10:05:12",
      text: "A concise view of risk, with enough context to understand why something rose to the top.",
      insight: true,
    },
  ],
  notes: [
    {
      id: "n1",
      interviewId: "maya-live",
      text: "Strong connection between priority, customer impact, and actionability.",
      createdAt: "2024-10-18T10:05:30-05:00",
    },
  ],
  playground: {
    interviewId: "maya-live",
    constraintIntroduced: false,
    revision: 1,
    saved: false,
    updatedAt: null,
  },
  slot: {
    id: "slot-1430",
    startsAt: "2024-10-18T14:30:00-05:00",
    endsAt: "2024-10-18T15:15:00-05:00",
    status: "open",
    eligibleCandidateIds: ["elena", "maya"],
  },
  offer: {
    id: "offer-elena",
    slotId: "slot-1430",
    candidateId: "elena",
    status: "idle",
    sentAt: null,
    respondedAt: null,
  },
  activity: [],
  baseline: {
    slotsRescued: 18,
    completedToday: 12,
    averageWaitSeconds: 504,
    eligibleCancellations: 29,
    offersSent: 17,
    offersAccepted: 12,
    messagesAvoided: 34,
  },
})

const clone = (value) => structuredClone(value)

export function createStore(filePath) {
  let state
  let writeChain = Promise.resolve()

  async function init() {
    if (!filePath) {
      state = initialState()
      return
    }
    try {
      state = JSON.parse(await readFile(filePath, "utf8"))
    } catch (error) {
      if (error.code !== "ENOENT") throw error
      state = initialState()
      await persist()
    }
  }

  async function persist() {
    if (!filePath) return
    await mkdir(path.dirname(filePath), { recursive: true })
    const temporary = `${filePath}.tmp`
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8")
    await rename(temporary, filePath)
  }

  return {
    init,
    read() {
      return clone(state)
    },
    async update(mutator) {
      let result
      writeChain = writeChain.catch(() => {}).then(async () => {
        result = await mutator(state)
        await persist()
      })
      await writeChain
      return clone(result)
    },
    reset: async () => {
      state = initialState()
      await persist()
      return clone(state)
    },
  }
}
