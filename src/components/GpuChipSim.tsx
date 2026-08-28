'use client'

import {useEffect, useRef, useState} from 'react'
import { SIM_CSS } from './gpuread-shared'
import {
  Chip,
  NSM,
  NMC,
  SETS,
  WAYS,
  WQ_LINES,
  RQ_LINES,
  MC_WRITE_GBS,
  MC_READ_GBS,
  LINE,
} from './gpuwrite-chip'

// The whole die, and a store's afterlife at chip scale: a kernel writing 72 MB
// of output, then one streaming through 96 MB of input, over and over (chip.ts).
// The L2 band is one pixel per set, coloured by how many of its sixteen lines
// are dirty; the controllers show their write and read backlogs; the DRAM row
// shows what each chip is doing this instant. Under the die, the bandwidth
// over the last stretch of simulated time: what the SMs push into the L2, and
// what the DRAM actually writes and reads.

const DT_NS = 50 // one model step
const NS_PER_MS = 10 // simulated ns per wall millisecond: 10 µs per second
const MAX_STEPS = 14 // per frame, so a slow frame does not spiral
const SAMPLE_EVERY = 3 // frames per chart sample
const SAMPLES = 600 // ~30 s of wall time at 60 fps: one write/read cycle

const SLICE_W = 16 // pixels per slice block: 16 x 64 = 1024 sets
const SLICE_H = 64
const SLICE_GAP = 2
const GROUP_GAP = 4
const GROUP_W = 3 * SLICE_W + 2 * SLICE_GAP
const CANVAS_W = NMC * GROUP_W + (NMC - 1) * GROUP_GAP

type Sample = { intake: number; write: number; read: number; store: boolean }

type Rgb = [number, number, number]
function cssRgb(el: HTMLElement, name: string, ctx: CanvasRenderingContext2D): Rgb {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  ctx.fillStyle = '#000'
  ctx.fillStyle = v
  ctx.fillRect(0, 0, 1, 1)
  const d = ctx.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2]]
}

const POP: Uint8Array = new Uint8Array(65536)
for (let i = 1; i < 65536; i++) POP[i] = POP[i >> 1] + (i & 1)

export default function GpuChipSim() {
  const chip = useRef<Chip>(new Chip(true))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const raf = useRef<number | null>(null)
  const lastMs = useRef(0)
  const frame = useRef(0)
  const acc = useRef({ intake: 0, write: 0, read: 0, ns: 0 })
  const samples = useRef<Sample[]>([])
  const probe = useRef<CanvasRenderingContext2D | null>(null)

  const [, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)

  const rerender = () => setTick((t) => t + 1)

  const paintL2 = () => {
    const cv = canvasRef.current
    const root = rootRef.current
    if (!cv || !root) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    if (!probe.current) {
      const p = document.createElement('canvas')
      p.width = 1
      p.height = 1
      probe.current = p.getContext('2d', { willReadFrequently: true })
    }
    const pc = probe.current
    if (!pc) return
    const clean = cssRgb(root, '--data', pc)
    const dirty = cssRgb(root, '--accent', pc)
    const empty = cssRgb(root, '--tile-hover', pc)
    const img = ctx.createImageData(CANVAS_W, SLICE_H)
    const px = img.data
    px.fill(0)
    const c = chip.current
    for (let s = 0; s < 36; s++) {
      const g = (s / 3) | 0
      const x0 = g * (GROUP_W + GROUP_GAP) + (s % 3) * (SLICE_W + SLICE_GAP)
      for (let i = 0; i < SETS; i++) {
        const idx = s * SETS + i
        const n = c.n[idx]
        const d = POP[c.bits[idx]]
        const x = x0 + (i % SLICE_W)
        const y = (i / SLICE_W) | 0
        const o = (y * CANVAS_W + x) * 4
        let r: number, gg: number, b: number
        if (n === 0) {
          ;[r, gg, b] = empty
        } else {
          const f = d / WAYS
          r = clean[0] + (dirty[0] - clean[0]) * f
          gg = clean[1] + (dirty[1] - clean[1]) * f
          b = clean[2] + (dirty[2] - clean[2]) * f
        }
        px[o] = r
        px[o + 1] = gg
        px[o + 2] = b
        px[o + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }

  const tick = (now: number) => {
    const c = chip.current
    const elapsed = lastMs.current ? Math.min(now - lastMs.current, 100) : 16
    lastMs.current = now
    const steps = Math.min(MAX_STEPS, Math.max(1, Math.round((elapsed * NS_PER_MS) / DT_NS)))
    const a = acc.current
    for (let i = 0; i < steps; i++) {
      const f = c.step(DT_NS)
      a.intake += f.intakeGbs * DT_NS
      a.write += f.writeGbs * DT_NS
      a.read += f.readGbs * DT_NS
      a.ns += DT_NS
    }
    frame.current++
    if (frame.current % SAMPLE_EVERY === 0 && a.ns > 0) {
      samples.current.push({
        intake: a.intake / a.ns,
        write: a.write / a.ns,
        read: a.read / a.ns,
        store: c.phase === 'write',
      })
      if (samples.current.length > SAMPLES) samples.current.shift()
      acc.current = { intake: 0, write: 0, read: 0, ns: 0 }
    }
    paintL2()
    rerender()
    raf.current = requestAnimationFrame(tick)
  }

  const stop = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current)
    raf.current = null
    lastMs.current = 0
    setPlaying(false)
  }
  useEffect(() => {
    paintL2()
    return () => stop()
  }, [])

  const togglePlay = () => {
    if (playing) {
      stop()
      return
    }
    setPlaying(true)
    raf.current = requestAnimationFrame(tick)
  }

  const reset = () => {
    stop()
    chip.current.reset(true)
    samples.current = []
    acc.current = { intake: 0, write: 0, read: 0, ns: 0 }
    frame.current = 0
    paintL2()
    rerender()
  }

  // --- readouts -----------------------------------------------------------
  const c = chip.current
  const mcCap = (MC_WRITE_GBS * DT_NS) / LINE // lines a controller can write per step
  const stalled = c.stalled()
  const sm = c.smState
  const storePhase = c.phase === 'write'

  // chart geometry
  const CW = 680
  const CH = 110
  const PAD_L = 40
  const YMAX = 2000 // GB/s
  const sx = (i: number) => PAD_L + ((CW - PAD_L) * i) / (SAMPLES - 1)
  const sy = (v: number) => CH - 14 - ((CH - 20) * Math.min(v, YMAX)) / YMAX
  const smp = samples.current
  const off = SAMPLES - smp.length
  const area = (key: 'write' | 'read') => {
    if (!smp.length) return ''
    const pts = smp.map((s, i) => `${sx(off + i).toFixed(1)},${sy(s[key]).toFixed(1)}`)
    return `M${sx(off).toFixed(1)},${sy(0)} L${pts.join(' L')} L${sx(SAMPLES - 1).toFixed(1)},${sy(0)} Z`
  }
  const line = () =>
    smp.length ? 'M' + smp.map((s, i) => `${sx(off + i).toFixed(1)},${sy(s.intake).toFixed(1)}`).join(' L') : ''
  // the phase strip as runs of consecutive samples from the same kernel
  const runs: { store: boolean; from: number; to: number }[] = []
  smp.forEach((s, i) => {
    const last = runs[runs.length - 1]
    if (last && last.store === s.store) last.to = i
    else runs.push({ store: s.store, from: i, to: i })
  })

  const aria =
    'The whole RTX 4090 die under a workload of a kernel writing 72 megabytes then one ' +
    'reading 96, repeating. Rows: 128 SMs, the crossbar, the L2 as 36 slices with one ' +
    'pixel per set coloured by how many of its sixteen lines are dirty, the twelve ' +
    'memory controllers with their write and read backlogs, and the twelve DRAM chips ' +
    'with what each is doing now. Below the die, a chart of bandwidth over recent ' +
    'simulated time: what the SMs push into the L2, and what the DRAM writes and reads.'

  return (
    <div className="gsim chipsim" ref={rootRef}>
      <style dangerouslySetInnerHTML={{__html: SIM_CSS + CSS}} />

      <div className="controls">
        <div className="ctl-left">
          <button type="button" className="primary" onClick={togglePlay}>
            {playing ? 'pause' : 'play ▸'}
          </button>
        </div>
        <div className="ctl-right">
          <button type="button" onClick={reset}>reset</button>
        </div>
      </div>

      <div className="die" role="img" aria-label={aria}>
        <div className="lbl">SMs (128)</div>
        <div className="smgrid">
          {Array.from({ length: NSM }, (_, i) => {
            const st = sm[i]
            const cls =
              'smcell' +
              (st === 1 ? (storePhase ? ' st' : ' ld') : '') +
              (st === 2 ? ' stall st' : '') +
              (st === 3 ? ' stall ld' : '')
            return <div className={cls} key={i} />
          })}
        </div>

        <div className="band">crossbar</div>

        <div className="lbl">L2 (36 slices, 3 per controller), one pixel per set: how many of its 16 lines are dirty</div>
        <canvas className="l2" ref={canvasRef} width={CANVAS_W} height={SLICE_H} />

        <div className="lbl">memory controllers: write backlog, read backlog</div>
        <div className="mcs">
          {Array.from({ length: NMC }, (_, m) => (
            <div className="mc" key={m}>
              <div className="q">
                <div className="qfill st" style={{ width: `${Math.min(100, (100 * c.wq[m]) / WQ_LINES)}%` }} />
              </div>
              <div className="q">
                <div className="qfill ld" style={{ width: `${Math.min(100, (100 * c.rq[m]) / RQ_LINES)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="lbl">GDDR6X, 12 chips: what each is doing now</div>
        <div className="drams">
          {Array.from({ length: NMC }, (_, m) => {
            const w = c.mcWriteBytes[m] / LINE / mcCap
            const r = (c.mcReadBytes[m] / LINE / mcCap) * (MC_WRITE_GBS / MC_READ_GBS)
            return (
              <div className="dram" key={m}>
                <div className="dfill st" style={{ width: `${Math.min(100, 100 * w)}%` }} />
                <div className="dfill ld" style={{ width: `${Math.min(100, 100 * r)}%` }} />
              </div>
            )
          })}
        </div>
      </div>

      <svg className="chart" viewBox={`0 0 ${CW} ${CH}`} aria-hidden="true">
        {[500, 1000, 1500, 2000].map((v) => (
          <g key={v}>
            <line className="grid" x1={PAD_L} x2={CW} y1={sy(v)} y2={sy(v)} />
            <text className="ylbl" x={PAD_L - 4} y={sy(v) + 3}>
              {v === 2000 ? '2 TB/s' : (v / 1000).toFixed(1)}
            </text>
          </g>
        ))}
        <path className="a-write" d={area('write')} />
        <path className="a-read" d={area('read')} />
        <path className="l-intake" d={line()} />
        {/* the phase strip: which kernel was running */}
        {runs.map((r) => (
          <rect
            key={r.from}
            className={'ph ' + (r.store ? 'st' : 'ld')}
            x={sx(off + r.from)}
            y={CH - 8}
            width={sx(off + r.to) - sx(off + r.from) + (CW - PAD_L) / (SAMPLES - 1)}
            height={4}
          />
        ))}
      </svg>
      <div className="legend" aria-hidden="true">
        <span>
          <span className="sw ink" /> into the L2 from the SMs
        </span>
        <span>
          <span className="sw st" /> DRAM writes
        </span>
        <span>
          <span className="sw ld" /> DRAM reads
        </span>
        <span className="right">
          <span className="sw ph st" /> writing kernel <span className="sw ph ld" /> reading kernel
        </span>
      </div>

      <div className="status">
        <span>
          t <span className="n">{(c.t / 1000).toFixed(0)} µs</span> stored{' '}
          <span className="n">{(c.storedBytes / 1e6).toFixed(0)} MB</span> dirty in L2{' '}
          <span className="n">{(c.dirtyBytes() / 1e6).toFixed(1)} MB</span> written to DRAM{' '}
          <span className="n">{(c.writtenBytes / 1e6).toFixed(0)} MB</span> SMs throttled{' '}
          <span className="n">
            {stalled}/{NSM}
          </span>
        </span>
      </div>
    </div>
  )
}

const CSS = `
.chipsim .die { border: 1px solid var(--faint); border-radius: 10px; padding: 10px;
  display: flex; flex-direction: column; gap: 5px; }
.chipsim .die .lbl { font-size: 10px; color: var(--muted); line-height: 1.4; white-space: normal;
  margin: 0; }
.chipsim .smgrid { display: grid; grid-template-columns: repeat(32, 1fr); gap: 2px; }
.chipsim .smcell { height: 9px; border-radius: 1px; background: var(--tile-hover); box-sizing: border-box; }
.chipsim .smcell.st { background: var(--accent-wash); }
.chipsim .smcell.ld { background: var(--data-wash); }
.chipsim .smcell.stall.st { background: var(--accent); opacity: 0.85; }
.chipsim .smcell.stall.ld { background: var(--data); border: 1px solid var(--muted); }
.chipsim .band { height: 16px; background: var(--tile); border-radius: 4px; display: flex;
  align-items: center; justify-content: center; font-size: 10px; color: var(--muted); margin: 1px 0; }
.chipsim canvas.l2 { display: block; width: 100%; min-width: 0; height: auto;
  image-rendering: pixelated; border-radius: 2px; }
.chipsim .die { min-width: 0; }
.chipsim .mcs, .chipsim .drams { display: grid; grid-template-columns: repeat(${NMC}, 1fr); gap: 4px; }
.chipsim .mc { display: flex; flex-direction: column; gap: 2px; }
.chipsim .q { height: 6px; background: var(--tile); border-radius: 2px; overflow: hidden; }
.chipsim .qfill { height: 100%; border-radius: 2px; }
.chipsim .qfill.st, .chipsim .dfill.st { background: var(--accent); opacity: 0.85; }
.chipsim .qfill.ld, .chipsim .dfill.ld { background: var(--data); }
.chipsim .dram { height: 14px; background: var(--tile); border-radius: 3px; overflow: hidden;
  display: flex; }
.chipsim .dfill { height: 100%; }
.chipsim .chart { display: block; width: 100%; height: auto; margin-top: 8px; }
.chipsim .chart .grid { stroke: var(--faint); stroke-width: 0.5; opacity: 0.6; }
.chipsim .chart .ylbl { font-family: var(--font-mono); font-size: 8px; fill: var(--faint); text-anchor: end; }
.chipsim .chart .a-write { fill: var(--accent); opacity: 0.55; }
.chipsim .chart .a-read { fill: var(--data); opacity: 0.6; }
.chipsim .chart .l-intake { fill: none; stroke: var(--ink); stroke-width: 1.2; }
.chipsim .chart .ph.st { fill: var(--accent); opacity: 0.45; }
.chipsim .chart .ph.ld { fill: var(--data); opacity: 0.8; }
.chipsim .legend { display: flex; gap: 1.1rem; flex-wrap: wrap; align-items: center; margin-top: 0.3rem;
  font-size: 11px; color: var(--faint); }
.chipsim .legend > span { display: inline-flex; align-items: center; gap: 5px; }
.chipsim .legend .right { margin-left: auto; }
.chipsim .sw { display: inline-block; width: 14px; height: 8px; border-radius: 2px; }
.chipsim .sw.ink { height: 2px; background: var(--ink); }
.chipsim .sw.st { background: var(--accent); opacity: 0.55; }
.chipsim .sw.ld { background: var(--data); opacity: 0.6; }
.chipsim .sw.ph { height: 4px; }
.chipsim .sw.ph.st { opacity: 0.45; }
.chipsim .sw.ph.ld { opacity: 0.8; }
.chipsim .status .n { min-width: 0; margin-right: 0.3rem; }
@media (max-width: 640px) {
  .chipsim .smgrid { grid-template-columns: repeat(16, 1fr); }
  .chipsim .legend .right { margin-left: 0; }
}
`
