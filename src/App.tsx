import { useEffect, useState } from "react"
import { createBrowserRouter, RouterProvider } from "react-router"
import { api, type OfferStatus } from "./api"

type View = "Home" | "Interviews" | "Playground" | "Scheduling" | "Analytics"
const sections: View[] = [
  "Home",
  "Interviews",
  "Playground",
  "Scheduling",
  "Analytics",
]

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">J</span>
      <b>TalentIQ</b>
      <small>by J.B. Hunt</small>
    </div>
  )
}
function Chip({
  children,
  bright = false,
}: {
  children: React.ReactNode
  bright?: boolean
}) {
  return <span className={`chip ${bright ? "bright" : ""}`}>{children}</span>
}

function TalentIQ() {
  const [view, setView] = useState<View>("Home")
  const [role, setRole] = useState("Recruiter")
  const [constraint, setConstraint] = useState(false)
  const [revised, setRevised] = useState(false)
  const [offer, setOffer] = useState<OfferStatus>("idle")
  const [showCandidate, setShowCandidate] = useState(false)
  const [recovered, setRecovered] = useState(18)
  const [error, setError] = useState("")
  useEffect(() => {
    api
      .bootstrap()
      .then((data) => {
        setOffer(data.offer.status)
        setConstraint(data.playground.constraintIntroduced)
        setRevised(data.playground.revision > 1)
        setRecovered(data.analytics.slotsRescued)
      })
      .catch((err) => setError(err.message))
  }, [])
  const act = async <T,>(
    operation: () => Promise<T>,
    done: (value: T) => void,
  ) => {
    setError("")
    try {
      done(await operation())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }
  const sendOffer = () => act(api.sendOffer, (data) => setOffer(data.status))
  const acceptOffer = () =>
    act(api.acceptOffer, (data) => {
      setOffer(data.offer.status)
      setRecovered(data.analytics.slotsRescued)
      setShowCandidate(false)
    })
  const declineOffer = () =>
    act(api.declineOffer, (data) => {
      setOffer(data.status)
      setShowCandidate(false)
    })
  const revise = () =>
    act(api.introduceConstraint, (data) => {
      setConstraint(data.constraintIntroduced)
      setRevised(data.revision > 1)
    })
  const screen =
    view === "Interviews" ? (
      <Interview launch={() => setView("Playground")} report={setError} />
    ) : view === "Playground" ? (
      <Playground constraint={constraint} revise={revise} revised={revised} report={setError} />
    ) : view === "Scheduling" ? (
      <Scheduling
        offer={offer}
        send={sendOffer}
        preview={() => setShowCandidate(true)}
      />
    ) : view === "Analytics" ? (
      <Analytics recovered={recovered} />
    ) : role === "Interviewer" ? (
      <InterviewerHome open={setView} />
    ) : (
      <Home open={setView} recovered={recovered} />
    )
  if (role === "Candidate")
    return (
      <div className="candidate-mode">
        {error && (
          <div className="api-error" role="alert">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        <div className="candidate-role">
          <span>DEMO ROLE</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option>Recruiter</option>
            <option>Interviewer</option>
            <option>Candidate</option>
          </select>
        </div>
        <Candidate offer={offer} accept={acceptOffer} decline={declineOffer} report={setError} />
      </div>
    )
  const allowed =
    role === "Interviewer"
      ? sections.filter((x) => x !== "Scheduling" && x !== "Analytics")
      : sections
  return (
    <div className="new-app">
      {error && (
        <div className="api-error" role="alert">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
      <aside className="floating-rail">
        <Brand />
        <div className="rail-label">
          {role === "Interviewer" ? "INTERVIEW SPACE" : "OPERATIONS"}
        </div>
        {allowed.map((x) => (
          <button
            key={x}
            onClick={() => setView(x)}
            className={view === x ? "selected" : ""}
          >
            <i>{["⌂", "◉", "✧", "◫", "⌇"][sections.indexOf(x)]}</i>
            <span>{x}</span>
          </button>
        ))}
        <div className="rail-bottom">
          <button
            className="mini-bell"
            onClick={() => alert("No new notifications")}
          >
            ♧<em></em>
          </button>
          <div className="user-dot">{role === "Interviewer" ? "DK" : "AR"}</div>
        </div>
      </aside>
      <main className="stage">
        <div className="stage-top">
          <div className="crumb">
            TALENTIQ <span>/</span>{" "}
            {role === "Interviewer" ? "INTERVIEWER VIEW" : "RECRUITER VIEW"}
          </div>
          <div className="top-right">
            <button
              className="help"
              onClick={() =>
                alert("TalentIQ demo: switch roles to explore each workflow.")
              }
            >
              ?
            </button>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                setView("Home")
              }}
            >
              <option>Recruiter</option>
              <option>Interviewer</option>
              <option>Candidate</option>
            </select>
          </div>
        </div>
        {screen}
      </main>
      {showCandidate && (
        <div className="mobile-sheet">
          <button
            className="close-sheet"
            onClick={() => setShowCandidate(false)}
          >
            ×
          </button>
            <Candidate offer={offer} accept={acceptOffer} decline={declineOffer} report={setError} />
        </div>
      )}
    </div>
  )
}

const router = createBrowserRouter([{ path: "*", Component: TalentIQ }])
export default function App() {
  return <RouterProvider router={router} />
}

function Home({
  open,
  recovered,
}: {
  open: (v: View) => void
  recovered: number
}) {
  return (
    <div className="home-view">
      <section className="welcome">
        <div className="orb one"></div>
        <div className="orb two"></div>
        <p className="overline">FRIDAY · OCTOBER 18 · CENTRAL TIME</p>
        <h1>
          Make each
          <br />
          <i>moment count.</i>
        </h1>
        <p className="lede">
          Today’s candidate experience is in motion. Three interviews are ready
          for your attention.
        </p>
        <div className="welcome-actions">
          <button className="black-button" onClick={() => open("Interviews")}>
            Open live interview <span>→</span>
          </button>
          <button className="soft-button" onClick={() => open("Scheduling")}>
            Manage today’s schedule
          </button>
        </div>
        <div className="flow-strip">
          <span>
            Queue <b>03</b>
          </span>
          <i></i>
          <span>
            Interviews <b>12</b>
          </span>
          <i></i>
          <span>
            Reviews <b>03</b>
          </span>
        </div>
      </section>
      <section className="now-card">
        <div className="now-top">
          <span>NOW PLAYING</span>
          <button>•••</button>
        </div>
        <div className="wave">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </div>
        <div className="now-person">
          <div className="portrait">MT</div>
          <div>
            <b>Maya Thompson</b>
            <small>Follow-up interview · 02:00 PM</small>
          </div>
          <button onClick={() => open("Interviews")}>Join →</button>
        </div>
      </section>
      <section className="signal-row">
        <article>
          <span className="signal-icon yellow">↗</span>
          <div>
            <b>8m 24s</b>
            <small>Average wait</small>
          </div>
          <em>−12%</em>
        </article>
        <article>
          <span className="signal-icon lilac">✦</span>
          <div>
            <b>{recovered}</b>
            <small>Slots rescued</small>
          </div>
          <em>+4</em>
        </article>
        <article>
          <span className="signal-icon mint">✓</span>
          <div>
            <b>12</b>
            <small>Interviews complete</small>
          </div>
          <em>Today</em>
        </article>
      </section>
      <section className="home-bottom">
        <div className="glass-list">
          <div className="list-title">
            <h3>Your next moves</h3>
            <button>View all</button>
          </div>
          {[
            ["Transcript ready", "Maya Thompson", "Review draft summary"],
            ["A slot opened", "2:30 PM today", "Find eligible candidates"],
            ["Queue update", "Jordan Lee", "You’re next in 6 min"],
          ].map((x, i) => (
            <button
              key={x[0]}
              onClick={() =>
                i === 1
                  ? open("Scheduling")
                  : i === 0
                    ? open("Interviews")
                    : undefined
              }
            >
              <span className={`list-dot d${i}`}></span>
              <div>
                <b>{x[0]}</b>
                <small>{x[1]}</small>
              </div>
              <em>
                {x[2]} <i>›</i>
              </em>
            </button>
          ))}
        </div>
        <div className="insight">
          <span>TEAM PULSE</span>
          <h3>
            Faster paths.
            <br />
            Thoughtful decisions.
          </h3>
          <p>
            Slot Rescue has reduced candidate wait time by an average of{" "}
            <b>1.4 days</b> this month.
          </p>
          <button onClick={() => open("Analytics")}>Explore analytics →</button>
        </div>
      </section>
    </div>
  )
}

function InterviewerHome({ open }: { open: (v: View) => void }) {
  return (
    <div className="interviewer-home">
      <section className="interviewer-hero">
        <div>
          <p className="overline">DANA KIM · INTERVIEWER</p>
          <h1>
            Good afternoon.
            <br />
            <i>You’re ready.</i>
          </h1>
          <p>
            Your focus today is the conversation, not the coordination. We’ll
            handle the rest.
          </p>
          <button className="black-button" onClick={() => open("Interviews")}>
            Enter Maya’s interview <span>→</span>
          </button>
        </div>
        <div className="interviewer-clock">
          <span>UP NEXT</span>
          <b>02:00</b>
          <small>Maya Thompson · Operations Analyst</small>
          <i>45 min</i>
        </div>
      </section>
      <section className="interviewer-cards">
        <article>
          <span className="overline">TODAY</span>
          <b>03</b>
          <p>interviews assigned</p>
          <button onClick={() => open("Interviews")}>See run of show →</button>
        </article>
        <article>
          <span className="overline">NEEDS YOUR REVIEW</span>
          <b>02</b>
          <p>draft summaries ready</p>
          <button>Review drafts →</button>
        </article>
        <article className="interviewer-activity">
          <span className="overline">LAST SESSION</span>
          <p>
            <strong>Noah Williams</strong> · Interview notes and transcript are
            ready.
          </p>
          <div>
            <Chip bright>Draft summary</Chip>
            <button>Open →</button>
          </div>
        </article>
      </section>
      <section className="interviewer-list">
        <div className="list-title">
          <h3>Your interview run</h3>
          <span>Central Time</span>
        </div>
        {[
          ["01:00 PM", "Noah Williams", "Completed", "Review notes"],
          ["02:00 PM", "Maya Thompson", "Starting soon", "Enter room"],
          ["03:30 PM", "Elena Garcia", "Confirmed", "Prepare guide"],
        ].map((row, i) => (
          <div className="run-row" key={row[1]}>
            <time>{row[0]}</time>
            <div className="portrait small-portrait">
              {row[1]
                .split(" ")
                .map((x) => x[0])
                .join("")}
            </div>
            <div>
              <b>{row[1]}</b>
              <small>Follow-up interview</small>
            </div>
            <Chip bright={i === 1}>{row[2]}</Chip>
            <button onClick={() => i === 1 && open("Interviews")}>
              {row[3]} →
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}

function Interview({
  launch,
  report,
}: {
  launch: () => void
  report: (message: string) => void
}) {
  const [live, setLive] = useState(true)
  const toggle = () =>
    api
      .setTranscription(!live)
      .then((data) => setLive(data.transcribing))
      .catch((err) => report(err.message))
  const addNote = () => {
    const text = prompt("Add an interviewer note")
    if (text)
      api
        .addNote(text)
        .then(() => alert("Note saved"))
        .catch((err) => report(err.message))
  }
  return (
    <div className="work-view">
      <div className="work-title">
        <div>
          <p className="overline">INTERVIEW ROOM · DEMO DATA</p>
          <h2>
            Maya Thompson <Chip bright>Live</Chip>
          </h2>
          <span>Operations Analyst · Follow-up conversation</span>
        </div>
        <div className="people-stack">
          <i>DK</i>
          <i>AR</i>
          <button onClick={() => alert("Invite link copied")}>+ Invite</button>
        </div>
      </div>
      <div className="interview-stage">
        <section className="conversation">
          <div className="conversation-top">
            <div>
              <b>Interview conversation</b>
              <span>
                <i className={live ? "live-dot" : ""}></i>
                {live ? "Transcribing" : "Paused"}
              </span>
            </div>
            <div>
              <button onClick={toggle}>{live ? "Ⅱ Pause" : "▶ Resume"}</button>
              <button
                onClick={() => {
                  if (confirm("End this interview?") && live) toggle()
                }}
              >
                ■
              </button>
            </div>
          </div>
          <div className="transcript-bubble interviewer">
            <small>ALEX · 10:04:12</small>
            <p>
              Tell me how you decide what needs attention first when the
              information is incomplete.
            </p>
          </div>
          <div className="transcript-bubble candidate">
            <small>MAYA · 10:04:30</small>
            <p>
              I start with customer impact, then whether there’s a clear action
              the team can take right now.
            </p>
          </div>
          <div className="transcript-bubble interviewer">
            <small>ALEX · 10:05:04</small>
            <p>What could make that decision easier for a dispatcher?</p>
          </div>
          <div className="transcript-bubble candidate highlight">
            <small>MAYA · 10:05:12</small>
            <p>
              A concise view of risk, with enough context to understand why
              something rose to the top.
            </p>
            <span>Insight captured ✦</span>
          </div>
        </section>
        <aside className="interview-side">
          <div className="note-card">
            <span>INTERVIEWER NOTES</span>
            <p>
              Strong connection between priority, customer impact, and
              actionability.
            </p>
            <button onClick={addNote}>+ Add note</button>
          </div>
          <div className="summary-card">
            <Chip bright>AI DRAFT</Chip>
            <h3>Review, don’t rely.</h3>
            <p>
              Maya frames prioritization as a balance between impact and a
              practical next action.
            </p>
            <button
              onClick={() => alert("Draft summary opened for human review")}
            >
              Open summary →
            </button>
          </div>
          <button className="playground-launch" onClick={launch}>
            <span>✧</span>
            <div>
              <b>Try Product Playground</b>
              <small>A collaborative design activity</small>
            </div>
            <i>→</i>
          </button>
        </aside>
      </div>
    </div>
  )
}

function Playground({
  constraint,
  revise,
  revised,
  report,
}: {
  constraint: boolean
  revise: () => void
  revised: boolean
  report: (message: string) => void
}) {
  const save = () => api.savePlayground().then(() => alert("Session saved")).catch((error) => report(error.message))
  return (
    <div className="playground-view">
      <div className="playground-head">
        <div>
          <p className="overline">PRODUCT PLAYGROUND · OPTIONAL ACTIVITY</p>
          <h2>Imagine the next best move.</h2>
          <p>A collaborative exercise for thoughtful, observable reasoning.</p>
        </div>
        <div className="play-status">
          <span>Maya Thompson</span>
          <Chip bright>Step {revised ? "5" : "3"} of 6</Chip>
        </div>
      </div>
      {constraint && (
        <div className="constraint-pill">
          <span>⌁</span>
          <b>Design condition: unreliable connectivity</b>
          <small>Adapt the concept without losing dispatcher confidence.</small>
        </div>
      )}
      <div className="playground-shell">
        <aside className="challenge">
          <span className="overline">THE PROMPT</span>
          <h3>Help a dispatcher decide what needs attention first.</h3>
          <p>
            Use this shipment-tracking prototype as a conversation starter — not
            a real J.B. Hunt product.
          </p>
          <div className="mini-product">
            <header>
              <b>Active loads</b>
              <span>◦ Prototype</span>
            </header>
            <div>
              <i className="red-dot"></i>
              <b>Little Rock → Atlanta</b>
              <small>Delayed · 4h 20m</small>
            </div>
            <div>
              <i className="yellow-dot"></i>
              <b>Dallas → Memphis</b>
              <small>At risk · 1h 05m</small>
            </div>
            <div>
              <i className="green-dot"></i>
              <b>Tulsa → Nashville</b>
              <small>On time</small>
            </div>
          </div>
          <div className="challenge-foot">
            <span>EXPLORE</span>
            <span>→ NAME THE PROBLEM</span>
            <span className="current">→ SKETCH</span>
          </div>
        </aside>
        <section className="creative-canvas">
          <div className="canvas-top">
            <div className="toolset">
              <button className="tool-on">↖</button>
              <button>✎</button>
              <button>▢</button>
              <button>T</button>
            </div>
            <div>
              <button>↶</button>
              <button>↷</button>
              <button>•••</button>
            </div>
          </div>
          <div className="canvas-content">
            <div className="canvas-heading">
              Maya’s {revised ? "adapted" : "first"} idea{" "}
              <small>saved moments ago</small>
            </div>
            <div className="note n1">
              not every delay
              <br />
              needs attention
            </div>
            <div className="note n2">
              show impact
              <br />+ next action
            </div>
            <div className="idea-window">
              <header>
                <b>Priority view</b>
                <span>⌁</span>
              </header>
              <div className="priority p1">
                <b>01</b>
                <span>High customer impact</span>
                <i>Call customer</i>
              </div>
              <div className="priority p2">
                <b>02</b>
                <span>At risk</span>
                <i>Check carrier</i>
              </div>
              <div className="priority p3">
                <b>03</b>
                <span>Monitor</span>
              </div>
              {revised && (
                <div className="cached">
                  Last synced 2 min ago · Refreshing when connected
                </div>
              )}
            </div>
            <div className="cursor c-maya">Maya</div>
            <div className="cursor c-alex">Alex</div>
          </div>
          <div className="canvas-bottom">
            <span>
              <i></i> 2 collaborators
            </span>
            <span>
              {revised ? "Version 2" : "Version 1"} ·{" "}
              {revised ? "Constraint response" : "Initial thinking"}
            </span>
          </div>
        </section>
        <aside className="evidence">
          <span className="overline">MOMENTS</span>
          {[
            [
              "10:08",
              "Problem named",
              "“Priority is not just delay duration.”",
            ],
            ["10:12", "Sketch saved", "Initial concept · linked transcript"],
            [
              constraint ? "10:16" : "NEXT",
              constraint ? "Constraint introduced" : "Adapt the idea",
              "Unreliable connectivity",
            ],
          ].map((x, i) => (
            <div className={i === 2 ? "moment active" : "moment"} key={x[1]}>
              <time>{x[0]}</time>
              <div>
                <b>{x[1]}</b>
                <small>{x[2]}</small>
              </div>
            </div>
          ))}
          <div className="evidence-quote">
            “I’d show when a status was last updated, so the dispatcher can
            decide with context.”<small>Maya · 10:18:03</small>
          </div>
          {!constraint ? (
            <button className="black-button full" onClick={revise}>
              Introduce constraint <span>→</span>
            </button>
          ) : (
            <button className="black-button full" onClick={save}>
              Save session <span>→</span>
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}

function Scheduling({
  offer,
  send,
  preview,
}: {
  offer: string
  send: () => void
  preview: () => void
}) {
  return (
    <div className="schedule-view">
      <div className="schedule-head">
        <div>
          <p className="overline">SCHEDULING · CENTRAL TIME</p>
          <h2>Make room for momentum.</h2>
        </div>
        <Chip bright>
          {offer === "accepted" ? "1 slot rescued" : "1 opening found"}
        </Chip>
      </div>
      <section className="rescue-hero">
        <div className="rescue-visual">
          <div className="time-ring">
            <b>2:30</b>
            <span>PM · CT</span>
          </div>
          <div className="orbit o1"></div>
          <div className="orbit o2"></div>
          <i>✦</i>
        </div>
        <div>
          <span className="overline">SLOT RESCUE</span>
          <h3>
            {offer === "accepted"
              ? "A better time, confirmed."
              : "An opening just became possible."}
          </h3>
          <p>
            {offer === "accepted"
              ? "Elena accepted today’s earlier interview. Her original appointment was released only after confirmation."
              : "A follow-up was cancelled. We found an opted-in candidate whose stated availability matches."}
          </p>
          <div className="rescue-actions">
            {(offer === "idle" || offer === "declined") && (
              <button className="black-button" onClick={send}>
                Find the right candidate <span>→</span>
              </button>
            )}
            {offer === "sent" && (
              <button className="black-button" onClick={preview}>
                Preview candidate offer <span>→</span>
              </button>
            )}
            {offer === "accepted" && <Chip bright>✓ Calendar updated</Chip>}
            <button className="soft-button">See eligibility</button>
          </div>
        </div>
        <div className="rescue-detail">
          <span>OFFER STATUS</span>
          {offer === "idle" || offer === "declined" ? (
            <>
              <b>Ready to offer</b>
              <p>2 candidates checked</p>
            </>
          ) : offer === "sent" ? (
            <>
              <b>04:42</b>
              <p>Offer held for Elena</p>
            </>
          ) : (
            <>
              <b>Confirmed</b>
              <p>2:19 PM today</p>
            </>
          )}
        </div>
      </section>
      <section className="calendar-pane">
        <div className="calendar-title">
          <b>Friday, October 18</b>
          <span>Today</span>
          <button>‹</button>
          <button>›</button>
        </div>
        <div className="calendar">
          <div className="hours">
            {[
              "9 AM",
              "10 AM",
              "11 AM",
              "12 PM",
              "1 PM",
              "2 PM",
              "3 PM",
              "4 PM",
            ].map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <div className="calendar-day">
            <b>FRI 18</b>
            <div className="cal-event blue" style={{ top: "66px" }}>
              Jordan Lee <small>Screen · 9:30 AM</small>
            </div>
            <div className="cal-event neutral" style={{ top: "182px" }}>
              Maya Thompson <small>Follow-up · 11:30 AM</small>
            </div>
            <div
              className={`cal-event ${
                offer === "accepted" ? "rescue" : "open"
              }`}
              style={{ top: "344px" }}
            >
              {offer === "accepted" ? "Elena Garcia" : "Open · canceled"}{" "}
              <small>Follow-up · 2:30 PM</small>
            </div>
          </div>
          <div className="calendar-day dim">
            <b>SAT 19</b>
            <div className="cal-event muted" style={{ top: "104px" }}>
              Elena Garcia{" "}
              <small>
                {offer === "accepted" ? "Released" : "Follow-up · 10:00 AM"}
              </small>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Candidate({
  offer,
  accept,
  decline,
  report,
}: {
  offer: string
  accept: () => void
  decline: () => void
  report: (message: string) => void
}) {
  const [stage, setStage] = useState<"scan" | "confirm" | "queue">("scan")
  const queueAction = (action: "check-in" | "join" | "leave", next: "scan" | "confirm" | "queue") =>
    api.queue(action).then(() => setStage(next)).catch((error) => report(error.message))
  return (
    <div className="candidate-view">
      <div className="candidate-nav">
        <Brand />
        <span>•••</span>
      </div>
      {offer === "sent" ? (
        <div className="candidate-main">
          <div className="candidate-glow"></div>
          <p className="overline">A LITTLE EARLIER</p>
          <h1>Your time opened up.</h1>
          <p>
            We found an earlier interview time that matches your availability.
            Your current appointment stays safe until you choose.
          </p>
          <div className="time-card">
            <span>TODAY · CENTRAL TIME</span>
            <b>2:30 — 3:15 PM</b>
            <small>Friday, October 18</small>
          </div>
          <div className="current-slot">
            Current appointment <b>Saturday · 10:00 AM</b>
          </div>
          <button className="black-button full" onClick={accept}>
            Accept earlier interview <span>→</span>
          </button>
          <button className="soft-button full" onClick={decline}>Keep my current time</button>
          <small className="fine">
            Demo offer · availability is rechecked before confirmation.
          </small>
        </div>
      ) : stage === "scan" ? (
        <div className="candidate-main">
          <p className="overline">CAREER EVENT CHECK-IN</p>
          <h1>
            Welcome.
            <br />
            <i>Let’s get you ready.</i>
          </h1>
          <div className="scan-art">
            ▦<span>Scan event code</span>
          </div>
          <p>
            Scanning reserves your place in the virtual queue. It does not
            schedule an interview appointment.
          </p>
          <button
            className="black-button full"
            onClick={() => queueAction("check-in", "confirm")}
          >
            Scan event QR code <span>→</span>
          </button>
          <button className="soft-button full">Camera permission help</button>
        </div>
      ) : stage === "confirm" ? (
        <div className="candidate-main">
          <p className="overline">CHECK-IN CONFIRMED</p>
          <h1>
            One quick
            <br />
            <i>confirmation.</i>
          </h1>
          <div className="candidate-details">
            <b>J.B. Hunt Career Event</b>
            <span>Operations Analyst</span>
            <span>River Market Conference Center</span>
            <span>Today · Central Time</span>
          </div>
          <p>
            Joining the queue saves your place. It does not create or change an
            interview appointment.
          </p>
          <button
            className="black-button full"
            onClick={() => queueAction("join", "queue")}
          >
            Join virtual queue <span>→</span>
          </button>
          <button className="soft-button full" onClick={() => setStage("scan")}>
            Back
          </button>
        </div>
      ) : (
        <div className="candidate-main queue-screen">
          <div className="queue-check">✓</div>
          <p className="overline">YOU’RE CHECKED IN</p>
          <h1>
            You’re
            <br />
            <i>next.</i>
          </h1>
          <div className="queue-position">
            <b>01</b>
            <span>
              Position in queue
              <br />
              <strong>About 6 minutes</strong>
            </span>
          </div>
          <p>
            Stay nearby. We’ll let you know as soon as your interviewer is
            ready.
          </p>
          <button className="soft-button full" onClick={() => queueAction("leave", "scan")}>Leave queue</button>
        </div>
      )}
    </div>
  )
}

function Analytics({ recovered }: { recovered: number }) {
  return (
    <div className="analytics-view">
      <div>
        <p className="overline">OPERATIONS ANALYTICS · DEMO DATA</p>
        <h2>
          Less waiting.
          <br />
          <i>More possibility.</i>
        </h2>
        <p>
          Recruiting operations metrics, held apart from individual candidate
          evaluation.
        </p>
      </div>
      <div className="big-metric">
        <span>SLOTS RESCUED</span>
        <b>{recovered}</b>
        <small>62% of eligible cancellations</small>
      </div>
      <section className="metric-capsules">
        <div>
          <span>WAIT TIME REDUCED</span>
          <b>
            1.4 <small>days</small>
          </b>
          <em>+0.3 this month</em>
        </div>
        <div>
          <span>OFFER ACCEPTANCE</span>
          <b>
            71<small>%</small>
          </b>
          <em>12 of 17 accepted</em>
        </div>
        <div>
          <span>MESSAGES AVOIDED</span>
          <b>34</b>
          <em>Estimated</em>
        </div>
      </section>
      <section className="chart-sheet">
        <div>
          <span>RECOVERY MOMENTUM</span>
          <h3>Slots recovered over time</h3>
        </div>
        <div className="soft-chart">
          {[31, 48, 44, 62, 57, 78, 69, 85, 74, 95, 82, 100].map((x, i) => (
            <i key={i} style={{ height: `${x}%` }}></i>
          ))}
        </div>
        <footer>
          <span>Oct 1</span>
          <span>Oct 18</span>
        </footer>
      </section>
    </div>
  )
}
