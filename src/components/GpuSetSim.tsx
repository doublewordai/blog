'use client'

import {useEffect, useRef, useState} from 'react'
import { SIM_CSS } from './gpuread-shared'
import { WAYS, DIRTY_LIMIT, newSet, access, dirtyCount, type SetState, type Ev } from './gpuwrite-l2set'

// One L2 set, sixteen ways, run by the recovered replacement policy (l2set.ts,
// a port of nvemu's L2Cache). `play` streams a workload through the set: a
// kernel writing sixteen lines of output, then one streaming thirty-two lines
// of input, over and over -- the post's own story, a store's afterlife under
// the next kernel's traffic. Clicking a line reads it. Each tile shows the
// line's four sectors (blue clean, warm dirty, hatched once written back but
// still readable) and its RRPV as dots: two dots and the line is next to go.
// Under the set, a trace of the last accesses: a tick per access, coloured by
// kind, with a bar above it for the lines that access sent to DRAM. The `≤8
// dirty` toggle is the janitor rule from the text.

const WRITE_PHASE = 16 // lines a kernel writes
const READ_PHASE = 32 // lines the next kernel reads
const STEP_MS = 210
const FLASH_MS = 420
const TRACE = WRITE_PHASE + READ_PHASE // one full cycle in view

type Trace = { store: boolean; wb: number }

// Stable positions for the tiles: a line keeps its way until it leaves.
function assignSlots(prev: (string | null)[], present: string[]): (string | null)[] {
  const have = new Set(present)
  const next = prev.map((t) => (t && have.has(t) ? t : null))
  const placed = new Set(next.filter((t): t is string => t !== null))
  for (const t of present) {
    if (placed.has(t)) continue
    const free = next.indexOf(null)
    if (free < 0) break
    next[free] = t
    placed.add(t)
  }
  return next
}

function touchedTags(evs: Ev[]): Set<string> {
  const s = new Set<string>()
  for (const e of evs) if ('tag' in e) s.add(e.tag)
  return s
}

// A set never sits empty: start with sixteen clean resident lines.
function seeded(janitor: boolean): SetState {
  const s = newSet(janitor)
  for (let r = 0; r < WAYS; r++) access(s, `o${r}`, false)
  s.writebacks = 0
  return s
}

export default function GpuSetSim() {
  const set = useRef<SetState>(seeded(true))
  const slots = useRef<(string | null)[]>(
    assignSlots(Array(WAYS).fill(null), set.current.lines.map((l) => l.tag))
  )
  const fresh = useRef(0)
  const phase = useRef(0) // position in the write/read cycle
  const trace = useRef<Trace[]>([])
  const flash = useRef<number | null>(null)
  const timer = useRef<number | null>(null)

  const [, setTick] = useState(0)
  const [janitor, setJanitor] = useState(true)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [playing, setPlaying] = useState(false)

  const rerender = () => setTick((t) => t + 1)

  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    setPlaying(false)
  }
  useEffect(
    () => () => {
      stop()
      if (flash.current !== null) clearTimeout(flash.current)
    },
    []
  )

  const apply = (tag: string, store: boolean) => {
    const s = set.current
    const before = s.writebacks
    const evs = access(s, tag, store)
    slots.current = assignSlots(slots.current, [...s.lines.map((l) => l.tag), ...s.wb])
    trace.current = [...trace.current, { store, wb: s.writebacks - before }].slice(-TRACE)
    setTouched(touchedTags(evs))
    if (flash.current !== null) clearTimeout(flash.current)
    flash.current = window.setTimeout(() => setTouched(new Set()), FLASH_MS)
    rerender()
  }

  const step = () => {
    const store = phase.current < WRITE_PHASE
    phase.current = (phase.current + 1) % (WRITE_PHASE + READ_PHASE)
    apply(`n${fresh.current++}`, store)
    timer.current = window.setTimeout(step, STEP_MS)
  }

  const togglePlay = () => {
    if (playing) {
      stop()
      return
    }
    setPlaying(true)
    timer.current = window.setTimeout(step, 0)
  }

  const read = (tag: string) => apply(tag, false)

  const toggleJanitor = () => {
    set.current.janitor = !janitor
    setJanitor(!janitor)
  }

  const reset = () => {
    stop()
    set.current = seeded(janitor)
    slots.current = assignSlots(Array(WAYS).fill(null), set.current.lines.map((l) => l.tag))
    fresh.current = 0
    phase.current = 0
    trace.current = []
    setTouched(new Set())
    rerender()
  }

  const s = set.current
  const dirty = dirtyCount(s)
  const byTag = new Map(s.lines.map((l) => [l.tag, l]))
  const tr = trace.current
  const pad = TRACE - tr.length

  const aria =
    'One sixteen-way L2 set drawn as sixteen tiles. Each tile shows a line’s four ' +
    'sectors, blue when clean and warm when dirty, hatched once written back but ' +
    'still readable, and its re-reference value as dots. Play streams a workload ' +
    'through the set: a kernel writing sixteen lines, then one reading thirty-two, ' +
    'repeating. Clicking a tile reads that line; a toggle turns the eight-dirty rule ' +
    'on and off. Below the set, a trace of recent accesses shows how many lines each ' +
    'one sent to DRAM.'

  return (
    <div className="gsim setsim">
      <style dangerouslySetInnerHTML={{__html: SIM_CSS + CSS}} />

      <div className="controls">
        <div className="ctl-left">
          <button type="button" className="primary" onClick={togglePlay}>
            {playing ? 'pause' : 'play ▸'}
          </button>
        </div>
        <div className="ctl-right">
          <button
            type="button"
            className={'tog' + (janitor ? ' on' : '')}
            onClick={toggleJanitor}
            aria-pressed={janitor}
          >
            ≤{DIRTY_LIMIT} dirty rule {janitor ? 'on' : 'off'}
          </button>
          <button type="button" onClick={reset}>reset</button>
        </div>
      </div>

      <div className="grid" role="img" aria-label={aria}>
        {slots.current.map((tag, w) => {
          if (tag === null) return <div className="tile empty" key={`e${w}`} />
          const line = byTag.get(tag)
          const inWb = !line
          const cls =
            'tile' +
            (inWb ? ' wb' : line!.dirty ? ' dirty' : ' clean') +
            (touched.has(tag) ? ' touched' : '')
          const label = inWb
            ? 'written back, still readable'
            : `RRPV ${line!.rrpv}, ${line!.dirty ? 'dirty' : 'clean'}`
          return (
            <button
              type="button"
              className={cls}
              key={tag}
              onClick={() => read(tag)}
              aria-label={`read this line (${label})`}
            >
              <div className="sectors">
                {[0, 1, 2, 3].map((k) => (
                  <span className="sec" key={k} />
                ))}
              </div>
              <div className="dots" aria-hidden="true">
                {!inWb &&
                  [0, 1].map((k) => <span className={'dot' + (line!.rrpv > k ? ' on' : '')} key={k} />)}
              </div>
            </button>
          )
        })}
      </div>

      <div className="trace" aria-hidden="true">
        {Array.from({ length: pad }, (_, i) => (
          <div className="col" key={`p${i}`} />
        ))}
        {tr.map((t, i) => (
          <div className="col" key={`t${i}`}>
            {t.wb > 0 && <div className="bar" style={{ height: `${Math.min(WAYS, t.wb) * 2.4}px` }} />}
            <div className={'tick' + (t.store ? ' st' : ' ld')} />
          </div>
        ))}
      </div>

      <div className="legend" aria-hidden="true">
        <span>
          <span className="sw clean" /> clean
        </span>
        <span>
          <span className="sw dirty" /> dirty
        </span>
        <span>
          <span className="sw wb" /> written back
        </span>
        <span className="tracekey">
          <span className="sw tk ld" /> load <span className="sw tk st" /> store <span className="sw tkbar" /> lines to DRAM
        </span>
      </div>

      <div className="status">
        <span className={dirty >= DIRTY_LIMIT ? 'hot' : ''}>
          dirty{' '}
          <span className="n">
            {dirty}/{WAYS}
          </span>
        </span>
        <span>
          written back <span className="n">{s.writebacks}</span>
        </span>
      </div>
    </div>
  )
}

const CSS = `
.setsim button.tog { border: 1px solid var(--faint); background: transparent; }
.setsim button.tog.on { border-color: var(--accent); color: var(--accent); background: var(--accent-wash); }
.setsim .grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
.setsim .tile { display: flex; flex-direction: column; gap: 6px; padding: 8px 8px 6px;
  box-sizing: border-box; height: 38px;
  border-radius: 5px; background: var(--tile); border: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent; }
.setsim .tile:hover { background: var(--tile-hover); }
.setsim .tile.empty { background: transparent; border: 1px dashed var(--faint); opacity: 0.35;
  cursor: default; }
.setsim .tile.touched { animation: ss-flash ${FLASH_MS}ms ease-out; }
@keyframes ss-flash { 0% { box-shadow: 0 0 0 2px var(--accent); } 100% { box-shadow: 0 0 0 0 transparent; } }
@media (prefers-reduced-motion: reduce) { .setsim .tile.touched { animation: none;
  box-shadow: 0 0 0 1.5px var(--accent); } }
.setsim .sectors { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; }
.setsim .sec { display: block; height: 10px; border-radius: 2px; background: var(--data); }
.setsim .tile.dirty .sec { background: var(--accent); opacity: 0.85; }
.setsim .tile.wb .sec { background: repeating-linear-gradient(45deg, var(--accent),
  var(--accent) 2px, transparent 2px, transparent 5px); opacity: 0.55; }
.setsim .dots { display: flex; gap: 3px; align-items: center; height: 8px; }
.setsim .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  border: 1px solid var(--muted); opacity: 0.5; }
.setsim .dot.on { background: var(--muted); opacity: 0.8; }
.setsim .trace { display: flex; align-items: flex-end; gap: 2px; height: 46px; margin-top: 10px;
  padding: 0 1px; border-bottom: 1px solid var(--faint); }
.setsim .trace .col { flex: 1 1 0; display: flex; flex-direction: column; justify-content: flex-end;
  align-items: stretch; height: 100%; }
.setsim .trace .bar { background: var(--accent); opacity: 0.85; border-radius: 1px 1px 0 0; }
.setsim .trace .tick { height: 3px; margin-top: 1px; border-radius: 1px; }
.setsim .trace .tick.ld { background: var(--data); }
.setsim .trace .tick.st { background: var(--accent); opacity: 0.5; }
.setsim .legend { display: flex; gap: 1.1rem; flex-wrap: wrap; align-items: center; margin-top: 0.5rem;
  font-size: 11px; color: var(--faint); }
.setsim .legend > span { display: inline-flex; align-items: center; gap: 5px; }
.setsim .legend .tracekey { margin-left: auto; }
.setsim .sw { display: inline-block; width: 14px; height: 8px; border-radius: 2px; background: var(--data); }
.setsim .sw.dirty { background: var(--accent); opacity: 0.85; }
.setsim .sw.wb { background: repeating-linear-gradient(45deg, var(--accent), var(--accent) 2px,
  transparent 2px, transparent 5px); opacity: 0.55; }
.setsim .sw.tk { height: 3px; width: 10px; }
.setsim .sw.tk.st { background: var(--accent); opacity: 0.5; }
.setsim .sw.tkbar { width: 4px; height: 10px; background: var(--accent); opacity: 0.85; }
.setsim .status .hot { color: var(--accent); }
@media (max-width: 640px) {
  .setsim .grid { grid-template-columns: repeat(4, 1fr); }
  .setsim .legend .tracekey { margin-left: 0; }
}
`
