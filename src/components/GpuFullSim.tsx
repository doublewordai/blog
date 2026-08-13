'use client'

import {useEffect, useRef, useState} from 'react'
import {SIM_CSS, B_BASE, PA_BASE, B_FLOATS, LINE, l1SetIndex, sliceDigits} from './gpuread-shared'
import {l2SetIndex} from './gpuread-l2setindex'

// The whole die at once, and one load followed all the way into the DRAM.
// Several representative SMs (of 128) each run the vector add's global load in
// steady state: twelve resident warps per sub-partition, each issuing one
// `LDG` and parking on the dependency barrier. A dot per load walks the path
// the post followed — LSU, coalescer, L1 miss, crossbar, its L2 slice (the
// measured function on the physical address), its memory controller, and then
// down into one of that controller's banks, where it drives an activate, four
// column reads, and a precharge before the data climbs back to the register
// file. The slice and controller are the measured functions; the bank index
// within a controller is illustrative (the post measures the controller and
// the four-columns-in-one-row, not the bank bits). Every load misses
// everywhere, so what sets the pace is how many are in flight and how the 384
// banks absorb them in parallel — not how fast any one comes back.

const NSM = 128 // all SMs on the die
// A real Ada SM holds up to 48 resident warps (1536 threads), and a
// register-light kernel like vadd reaches full occupancy. That over-offers the
// banks past saturation, so the throughput pins at the measured tRC ceiling
// rather than being limited by how many loads we keep in flight.
const NWARPS = 48
const THREADS_PER_BLOCK = 256
const WARPS_PER_BLOCK = THREADS_PER_BLOCK / 32
const NBLOCKS = B_FLOATS / THREADS_PER_BLOCK
const LINES_PER_SM = (NBLOCKS / NSM) * WARPS_PER_BLOCK
const TOTAL_LINES = (B_FLOATS * 4) / Number(LINE)
const NMC = 12 // memory controllers
const NSLICES = 36
const NBANK = 32 // banks per controller (measured count; index illustrative)
const CPS = 160 // sim cycles per wall second
const PIN_BPC = 32.8 // one controller's pin bandwidth: 84 GB/s ≈ 32.8 B per sim cycle

// ~0.39 ns per sim cycle: the uncontended round trip below sums to ~650 cycles
// ≈ the measured 255 ns DRAM latency.
const NS_PER_CY = 255 / 654

const EXEC_CY = 6
const SPAWN_CY = 20 // a retired warp's slot sits empty until the next warp lands
const LSU_CY = 7 // one warp-wide load enters an SM's LSUs every seven cycles

// DRAM sub-events, in sim cycles, from the measured GDDR6X numbers:
// tRC (activate-to-activate on a bank) ≈ 52 ns, an activate ≈ 15 column reads,
// tRFC (a per-bank refresh blocks its bank) ≈ 210 ns, cadence tREFI ≈ 11 µs
// (compressed here so refreshes show up), hitting ~1.9% of accesses.
// Bank occupancy sums to tRC ≈ 52 ns ≈ 133 cy: a bank can re-activate that
// often, and 384 banks cycling at tRC saturate the ~950 GB/s pins by design.
// The rest of the 255 ns round trip lives in transport (L2 + crossbar), below.
const T_ACT = 40 // activate, bank opens the row
const T_READ = 53 // four 32-byte column reads; data ready at the end
const T_PRE = 40 // precharge, the row closes (closed-page: every load pays it)
const T_CMD = 30 // controller-to-DRAM command flight, visualized separately
const DQ_LINE_CY = 128 / PIN_BPC // one 128-byte line's occupancy of a controller's pins
const REF_BLOCK = 538 // a refresh pins its bank ~210 ns (tRFC)
const REF_I = 28300 // per-bank refresh cadence, tREFI ≈ 11 µs; 538/28300 ≈ 1.9%

// The fixed part of the trip, as (from, to, cycles) segments. Slice, MC and
// bank are resolved per request. The bank service in the middle is dynamic —
// it depends on whether the bank is free, so it is not a segment here.
type Seg = {a: string; b: string; d: number; first?: 'h' | 'v'}
const seg = (a: string, b: string, d: number, first?: 'h' | 'v'): Seg => ({a, b, d, first})
// Each load leaves from its own SM's tile (`l1-${sm}`); the register-file,
// LSU and coalescer legs of the earlier figures are collapsed into the SM here.
// `first` picks the axis a segment moves along before the other: 'v' drops/rises
// first (out of the SM, down a slice column), 'h' traverses the crossbar first.
const outSegs = (sm: number, s: number, m: number): Seg[] => [
  seg(`l1-${sm}`, `l1-${sm}`, 40, 'v'),
  seg(`l1-${sm}`, 'xbar', 55, 'v'),
  seg('xbar', `sl-${s}`, 65, 'h'),
  seg(`sl-${s}`, `sl-${s}`, 60, 'v'),
  seg(`sl-${s}`, `mc-${m}`, 35, 'v'),
]
const backSegs = (sm: number, s: number, m: number, bk: number): Seg[] => [
  seg(`bk-${m}-${bk}`, `mc-${m}`, 30, 'v'),
  seg(`mc-${m}`, `sl-${s}`, 35, 'v'),
  seg(`sl-${s}`, `sl-${s}`, 55, 'v'),
  seg(`sl-${s}`, 'xbar', 60, 'v'),
  seg('xbar', `l1-${sm}`, 66, 'h'),
  seg(`l1-${sm}`, `l1-${sm}`, 30, 'v'),
]
const T_TO_MC = outSegs(0, 0, 0).reduce((a, g) => a + g.d, 0)
const T_BACK = backSegs(0, 0, 0, 0).reduce((a, g) => a + g.d, 0)

// Which bank of its controller a line lands in — illustrative, a hash of the
// physical line address (the real bank bits were not recovered).
const bankOf = (pa: bigint) => Number(((pa >> 7n) ^ (pa >> 12n) ^ (pa >> 17n)) & 31n)

type WarpSt = 'ready' | 'stalled' | 'exec' | 'done' | 'finished'
type Warp = {st: WarpSt; until: number; outstanding: number; k: number}
type SM = {warps: Warp[]; lsuFree: number; kNext: number}

// Assign blocks round-robin across SMs, as in the L1 figure: SM s runs blocks
// s, s + NSM, s + 2*NSM, ... . `ordinal` counts this SM's warp-wide lines.
// Every returned k is therefore one of b's actual 32,768 cache-line indexes.
function lineForSmOrdinal(sm: number, ordinal: number): number | null {
  if (ordinal >= LINES_PER_SM) return null
  const blockRound = Math.floor(ordinal / WARPS_PER_BLOCK)
  const warpInBlock = ordinal % WARPS_PER_BLOCK
  const block = sm + blockRound * NSM
  return block * WARPS_PER_BLOCK + warpInBlock
}

// A load in flight. phase: 'out' descending to its controller, 'wait' in the
// controller's bank-target queue (or issued as a command), 'read' being served,
// 'dq' ready but waiting for the shared controller pins, 'back' climbing home.
type Phase = 'out' | 'wait' | 'read' | 'dq' | 'back'
type Req = {
  id: number
  sm: number
  warp: number
  s: number
  m: number
  bk: number
  vaLine: bigint
  paLine: bigint
  phase: Phase
  t0: number // issued
  tArr: number // reaches the controller request buffer
  tCmd: number // command leaves the controller; -1 while still queued
  tDqStart: number // begins using its controller's shared data pins
  tDqDone: number // final byte has crossed those pins
  dqCounted: boolean
  tBack: number // begins the pipelined trip home
}

type BankSt = 'idle' | 'cmd' | 'act' | 'open' | 'pre' | 'ref'
type Bank = {st: BankSt; until: number; req: Req | null; readDone: number}

export default function GpuFullSim() {
  const [, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(false)

  const cyc = useRef(0)
  const cycAcc = useRef(0)
  const sms = useRef<SM[]>(freshSms())
  const inflight = useRef<Req[]>([])
  const nextId = useRef(0)
  const l1 = useRef<number[][]>(freshL1()) // per SM: 256 sets, occupied ways 0..4
  const l2 = useRef<number[][]>(freshL2()) // per slice: 1024 sets, occupancy 0..3
  const sliceN = useRef<number[]>(Array(NSLICES).fill(0))
  const banks = useRef<Bank[][]>(freshBanks())
  const bankQ = useRef<Req[][]>(freshBankQ()) // per (controller,bank) waiter FIFO
  // Per-controller aggregate output bus. Channel/bank address bits are unknown,
  // so the known 84 GB/s chip-level capacity is the authoritative constraint.
  const dqFree = useRef<number[]>(Array(NMC).fill(0))
  const bankArb = useRef<number[]>(Array(NMC).fill(0))
  const refDue = useRef<number[][]>(freshRefs())
  const stats = useRef({lines: 0, bytes: 0, retired: 0, acts: 0, refs: 0})
  const mcBytes = useRef<number[]>(Array(NMC).fill(0)) // bytes each controller has delivered
  const mcUtil = useRef<number[]>(Array(NMC).fill(0)) // its pin-bus utilization, smoothed
  const mcSnap = useRef<number[]>(Array(NMC).fill(0))
  const snapCyc = useRef(0)

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fillBufRef = useRef<HTMLCanvasElement | null>(null)
  const anchors = useRef<Map<string, {x: number; y: number; w: number; h: number}>>(new Map())
  const dpr = useRef(1)
  const colors = useRef({out: '#b5532a', back: '#a8c7e4'})
  const raf = useRef<number | null>(null)
  const lastTs = useRef<number | null>(null)
  const lastRender = useRef(0)
  const fillsDirty = useRef(false)

  function freshWarps(sm: number): Warp[] {
    return Array.from({length: NWARPS}, (_, w) => ({
      st: 'ready' as WarpSt, until: 0, outstanding: 0, k: lineForSmOrdinal(sm, w)!,
    }))
  }
  function freshSms(): SM[] {
    return Array.from({length: NSM}, (_, i) => ({
      warps: freshWarps(i), lsuFree: 0, kNext: NWARPS,
    }))
  }
  function freshL1(): number[][] {
    return Array.from({length: NSM}, () => Array(256).fill(0))
  }
  function freshL2(): number[][] {
    return Array.from({length: NSLICES}, () => Array(1024).fill(0))
  }
  function freshBankQ(): Req[][] {
    return Array.from({length: NMC * NBANK}, () => [])
  }
  function freshBanks(): Bank[][] {
    return Array.from({length: NMC}, () =>
      Array.from({length: NBANK}, () => ({
        st: 'idle' as BankSt, until: 0, req: null, readDone: 0,
      }))
    )
  }
  function freshRefs(): number[][] {
    // stagger the first refresh of every bank across the cadence
    return Array.from({length: NMC}, (_, m) =>
      Array.from({length: NBANK}, (_, b) =>
        Math.floor((REF_I * ((m * NBANK + b) % (NMC * NBANK))) / (NMC * NBANK))
      )
    )
  }

  const measure = () => {
    const wrap = wrapRef.current
    if (!wrap) return
    const wr = wrap.getBoundingClientRect()
    const map = new Map<string, {x: number; y: number; w: number; h: number}>()
    wrap.querySelectorAll<HTMLElement>('[data-a]').forEach((el) => {
      const r = el.getBoundingClientRect()
      map.set(el.dataset.a!, {
        x: r.left + r.width / 2 - wr.left,
        y: r.top + r.height / 2 - wr.top,
        w: r.width,
        h: r.height,
      })
    })
    anchors.current = map
    const cv = canvasRef.current
    if (cv) {
      const d = Math.min(2, window.devicePixelRatio || 1)
      dpr.current = d
      cv.width = Math.round(wr.width * d)
      cv.height = Math.round(wr.height * d)
      cv.style.width = wr.width + 'px'
      cv.style.height = wr.height + 'px'
      const cs = getComputedStyle(wrap)
      colors.current = {
        out: cs.getPropertyValue('--accent').trim() || '#b5532a',
        back: cs.getPropertyValue('--data').trim() || '#a8c7e4',
      }
    }
  }

  useEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => {
      ro.disconnect()
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [])

  // Land a completed load: fill the issuing SM's L1 set (measured hash of the
  // virtual line address), retire the warp when its load is home.
  const complete = (r: Req, t: number) => {
    const row = l1.current[r.sm]
    const s = l1SetIndex(r.vaLine)
    if (row[s] < 4) row[s]++
    // the line also lands in its L2 slice's set (measured per-slice function)
    const l2row = l2.current[r.s]
    const ls = l2SetIndex(r.paLine, r.s)
    if (l2row[ls] < 3) l2row[ls]++
    sliceN.current[r.s]++
    fillsDirty.current = true
    stats.current.lines++
    stats.current.bytes += 128
    const w = sms.current[r.sm].warps[r.warp]
    w.outstanding--
    if (w.outstanding === 0) { w.st = 'exec'; w.until = t + EXEC_CY }
  }

  const step = (t: number) => {
    // 1. loads that have climbed all the way home retire
    const back = inflight.current
    for (let i = back.length - 1; i >= 0; i--) {
      const r = back[i]
      if (r.phase === 'back' && t >= r.tBack + T_BACK) {
        complete(r, t)
        back.splice(i, 1)
      }
    }
    // 2. warp bookkeeping: exec → done → next warp lands in the slot
    for (let si = 0; si < sms.current.length; si++) {
      const sm = sms.current[si]
      for (const w of sm.warps) {
        if (w.st === 'exec' && t >= w.until) {
          w.st = 'done'; w.until = t + SPAWN_CY; stats.current.retired++
        } else if (w.st === 'done' && t >= w.until) {
          const next = lineForSmOrdinal(si, sm.kNext)
          if (next === null) {
            w.st = 'finished'
          } else {
            w.st = 'ready'; w.k = next; sm.kNext++
          }
        }
      }
    }
    // 3. each SM issues one warp-wide load every LSU_CY cycles
    for (let si = 0; si < NSM; si++) {
      const sm = sms.current[si]
      if (sm.lsuFree > t) continue
      const wi = sm.warps.findIndex((w) => w.st === 'ready')
      if (wi < 0) continue
      const w = sm.warps[wi]
      // The actual cache line of b assigned to this SM by lineForSmOrdinal.
      const off = BigInt(w.k) * LINE
      const vaLine = B_BASE + off
      const paLine = PA_BASE + off
      const d = sliceDigits(paLine)
      const m = (d.p1 * 2 + d.p2) * 3 + d.a
      const req: Req = {
        id: nextId.current++, sm: si, warp: wi, s: d.slice, m, bk: bankOf(paLine),
        vaLine, paLine, phase: 'out', t0: t, tArr: t + T_TO_MC, tCmd: -1,
        tDqStart: 0, tDqDone: 0, dqCounted: false, tBack: 0,
      }
      inflight.current.push(req)
      w.outstanding++
      w.st = 'stalled'
      sm.lsuFree = t + LSU_CY
    }
    // 4. Arrivals enter a controller-owned queue, partitioned here by target
    // bank. These queues are scheduling state in the controller, not in DRAM.
    for (const r of inflight.current) {
      if (r.phase === 'out' && t >= r.tArr) {
        r.phase = 'wait'
        bankQ.current[r.m * NBANK + r.bk].push(r)
      }
    }
    // 5. Per-bank readiness model: refresh, activate, read, precharge. The
    // bank mapping and closed-page policy are illustrative; once data is ready,
    // the known shared controller-pin capacity below is a real service bound.
    for (let m = 0; m < NMC; m++) {
      const row = banks.current[m]
      const first = bankArb.current[m]
      let lastReady = -1
      for (let bi = 0; bi < NBANK; bi++) {
        const b = (first + bi) % NBANK
        const k = row[b]
        // refresh claims an idle bank on cadence
        if (k.st === 'idle' && t >= refDue.current[m][b]) {
          k.st = 'ref'; k.until = t + REF_BLOCK
          refDue.current[m][b] += REF_I; stats.current.refs++
          continue
        }
        // timed transitions
        if (k.st === 'ref' && t >= k.until) k.st = 'idle'
        else if (k.st === 'cmd' && t >= k.until) {
          k.st = 'act'; k.until = t + T_ACT; stats.current.acts++
        }
        else if (k.st === 'act' && t >= k.until) {
          k.st = 'open'; k.readDone = t + T_READ
          if (k.req) k.req.phase = 'read'
        } else if (k.st === 'open' && t >= k.readDone) {
          // The bank has produced a line. Reserve this controller's shared DQ
          // pins in ready order; transport latency is pipelined separately, so
          // later lines may start while earlier ones are still travelling home.
          if (k.req) {
            const r = k.req
            r.phase = 'dq'
            r.tDqStart = Math.max(t, dqFree.current[m])
            r.tDqDone = r.tDqStart + DQ_LINE_CY
            r.tBack = r.tDqStart
            dqFree.current[m] = r.tDqDone
            k.req = null
            lastReady = b
          }
          k.st = 'pre'; k.until = t + T_PRE
        } else if (k.st === 'pre' && t >= k.until) k.st = 'idle'
      }
      if (lastReady >= 0) bankArb.current[m] = (lastReady + 1) % NBANK

      // The controller issues the oldest request whose target bank is idle.
      // This permits ready requests to bypass an older request blocked on a
      // busy bank, but does not invent row-hit preference for this closed-page
      // model. One issue per sim cycle is non-binding relative to bank timing.
      let chosenBank = -1
      let chosen: Req | null = null
      for (let b = 0; b < NBANK; b++) {
        if (row[b].st !== 'idle') continue
        const head = bankQ.current[m * NBANK + b][0]
        if (head && (!chosen || head.tArr < chosen.tArr ||
          (head.tArr === chosen.tArr && head.id < chosen.id))) {
          chosen = head
          chosenBank = b
        }
      }
      if (chosen && chosenBank >= 0) {
        bankQ.current[m * NBANK + chosenBank].shift()
        chosen.tCmd = t
        const k = row[chosenBank]
        k.st = 'cmd'; k.until = t + T_CMD; k.req = chosen
      }
    }

    // 6. Controller output: queued lines start their return as their reserved
    // pin slots begin. Utilization counts bytes only after they cross the pins.
    for (const r of inflight.current) {
      if (!r.dqCounted && r.tDqDone > 0 && t >= r.tDqDone) {
        r.dqCounted = true
        mcBytes.current[r.m] += 128
      }
      if (r.phase === 'dq' && t >= r.tDqStart) r.phase = 'back'
    }
  }

  // position a dot along a fixed segment list; each segment is routed as an
  // L — full movement on `first` axis, then the other — so dots always travel
  // purely horizontally or vertically, never diagonally.
  const along = (segs: Seg[], rel: number) => {
    let i = 0, acc = 0
    while (i < segs.length - 1 && rel >= acc + segs[i].d) { acc += segs[i].d; i++ }
    const g = segs[i]
    const frac = Math.min(1, Math.max(0, (rel - acc) / g.d))
    const pa = anchors.current.get(g.a)
    const pb = anchors.current.get(g.b)
    if (!pa || !pb) return null
    const dx = pb.x - pa.x
    const dy = pb.y - pa.y
    // total length of an L is the sum of its two legs
    const total = Math.abs(dx) + Math.abs(dy)
    if (total === 0) return {x: pa.x, y: pa.y}
    const moved = frac * total
    if (g.first === 'v') {
      // vertical leg first, then horizontal
      const onV = Math.abs(dy)
      if (moved <= onV) return {x: pa.x, y: pa.y + Math.sign(dy) * moved}
      return {x: pa.x + Math.sign(dx) * (moved - onV), y: pb.y}
    }
    // horizontal leg first, then vertical
    const onH = Math.abs(dx)
    if (moved <= onH) return {x: pa.x + Math.sign(dx) * moved, y: pa.y}
    return {x: pb.x, y: pa.y + Math.sign(dy) * (moved - onH)}
  }

  // Fill each SM's L1 cell with a 16x16 grid of set-pixels: square (col,row)
  // n holds the fullness (0..4) of set n. Drawn into an offscreen buffer that
  // the frame blits before the dots, so pixels fade in only as sets fill but
  // the per-frame cost stays a single drawImage.
  const drawFills = () => {
    const cBack = colors.current.back
    const d = dpr.current
    const wrap = wrapRef.current
    if (!wrap) return
    // size the buffer to the die, in device pixels
    let buf = fillBufRef.current
    if (!buf) {
      buf = document.createElement('canvas')
      fillBufRef.current = buf
    }
    const r = wrap.getBoundingClientRect()
    const dw = Math.max(1, Math.round(r.width * d))
    const dh = Math.max(1, Math.round(r.height * d))
    if (buf.width !== dw || buf.height !== dh) { buf.width = dw; buf.height = dh }
    const ctx = buf.getContext('2d')
    if (!ctx) return
    ctx.setTransform(d, 0, 0, d, 0, 0)
    ctx.clearRect(0, 0, r.width, r.height)
    ctx.fillStyle = cBack
    for (let si = 0; si < NSM; si++) {
      const a = anchors.current.get(`l1-${si}`)
      const row = l1.current[si]
      if (!a || !row) continue
      const pw = a.w / 16
      const ph = a.h / 16
      for (let s = 0; s < 256; s++) {
        const full = row[s]
        if (full <= 0) continue
        ctx.globalAlpha = full / 4
        ctx.fillRect(a.x - a.w / 2 + (s % 16) * pw, a.y - a.h / 2 + ((s / 16) | 0) * ph, pw - 0.5, ph - 0.5)
      }
    }
    // each L2 slice: a 64x16 field of its 1024 sets, each line in its measured
    // set. The map is uniform, so a filling slice reads as an even speckle.
    for (let s = 0; s < NSLICES; s++) {
      const a = anchors.current.get(`sl-${s}`)
      const row = l2.current[s]
      if (!a || !row) continue
      const pw = a.w / 64
      const ph = a.h / 16
      for (let k = 0; k < 1024; k++) {
        const full = row[k]
        if (full <= 0) continue
        // bright floor: one line already reads, repeats deepen it
        ctx.globalAlpha = 0.55 + 0.15 * (full - 1)
        ctx.fillRect(a.x - a.w / 2 + (k % 64) * pw, a.y - a.h / 2 + ((k / 64) | 0) * ph, pw, ph)
      }
    }
    ctx.globalAlpha = 1
  }

  // Dots represent transfers, not resident state: warm until a request enters
  // its controller, briefly warm again when its command is issued to DRAM, and
  // blue while returned data travels home. Controller and bank state use bars.
  const drawDots = () => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const d = dpr.current
    ctx.setTransform(d, 0, 0, d, 0, 0)
    ctx.clearRect(0, 0, cv.width, cv.height)
    // refill the L1 set-grid buffer if sets have changed, then blit it so dots
    // and fills coexist (fills are the per-SM background the dots travel over)
    if (fillsDirty.current) { drawFills(); fillsDirty.current = false }
    if (fillBufRef.current) ctx.drawImage(fillBufRef.current, 0, 0, cv.width / d, cv.height / d)
    const t = cyc.current
    const c = colors.current
    for (const r of inflight.current) {
      let p: {x: number; y: number} | null
      let col = c.out
      let alpha = 0.85
      if (r.phase === 'out') {
        p = along(outSegs(r.sm, r.s, r.m), t - r.t0)
      } else if (r.phase === 'back') {
        col = c.back
        p = along(backSegs(r.sm, r.s, r.m, r.bk), t - r.tBack)
      } else if (r.tCmd >= 0 && t < r.tCmd + T_CMD) {
        p = along([seg(`mc-${r.m}`, `bk-${r.m}-${r.bk}`, T_CMD, 'v')], t - r.tCmd)
      } else {
        continue
      }
      if (!p) continue
      const jx = ((r.id * 2654435761) % 9) - 4
      const jy = ((r.id * 40503) % 7) - 3
      ctx.globalAlpha = alpha
      ctx.fillStyle = col
      ctx.fillRect(p.x + jx - 1, p.y + jy - 1, 2.4, 2.4)
    }
    ctx.globalAlpha = 1
  }

  const frame = (ts: number) => {
    const dt = lastTs.current === null ? 16 : Math.min(100, ts - lastTs.current)
    lastTs.current = ts
    cycAcc.current += (dt / 1000) * CPS
    const n = Math.floor(cycAcc.current)
    cycAcc.current -= n
    for (let i = 0; i < n; i++) { cyc.current++; step(cyc.current) }
    // each controller's pin-bus utilization = bytes delivered / pin capacity,
    // smoothed over a short window so it reads as a steady level
    const dcyc = cyc.current - snapCyc.current
    if (dcyc >= 8) {
      for (let m = 0; m < NMC; m++) {
        const rate = (mcBytes.current[m] - mcSnap.current[m]) / dcyc
        mcUtil.current[m] = mcUtil.current[m] * 0.85 + Math.min(1, rate / PIN_BPC) * 0.15
        mcSnap.current[m] = mcBytes.current[m]
      }
      snapCyc.current = cyc.current
    }
    drawDots()
    if (ts - lastRender.current > 80) {
      lastRender.current = ts
      setTick((x) => x + 1)
    }
    if (stats.current.retired === TOTAL_LINES && inflight.current.length === 0) {
      raf.current = null; lastTs.current = null; setPlaying(false); setDone(true)
      return
    }
    raf.current = requestAnimationFrame(frame)
  }

  const togglePlay = () => {
    if (playing) {
      if (raf.current !== null) cancelAnimationFrame(raf.current)
      raf.current = null; lastTs.current = null; setPlaying(false)
      return
    }
    if (done) reset() // finished run: start fresh
    setDone(false); setPlaying(true); measure()
    raf.current = requestAnimationFrame(frame)
  }

  const reset = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current)
    raf.current = null; lastTs.current = null; setPlaying(false); setDone(false)
    cyc.current = 0; cycAcc.current = 0
    sms.current = freshSms()
    inflight.current = []
    nextId.current = 0
    l1.current = freshL1()
    l2.current = freshL2()
    sliceN.current = Array(NSLICES).fill(0)
    banks.current = freshBanks()
    bankQ.current = freshBankQ()
    dqFree.current = Array(NMC).fill(0)
    bankArb.current = Array(NMC).fill(0)
    mcBytes.current = Array(NMC).fill(0)
    mcUtil.current = Array(NMC).fill(0)
    mcSnap.current = Array(NMC).fill(0)
    snapCyc.current = 0
    refDue.current = freshRefs()
    stats.current = {lines: 0, bytes: 0, retired: 0, acts: 0, refs: 0}
    const cv = canvasRef.current
    if (cv) { const ctx = cv.getContext('2d'); if (ctx) ctx.clearRect(0, 0, cv.width, cv.height) }
    fillsDirty.current = true
    fillBufRef.current = null
    setTick((x) => x + 1)
  }

  // which slices / controllers a load is resolving through right now
  const litSl = new Set<number>()
  const litMc = new Set<number>()
  for (const r of inflight.current) {
    if (r.phase === 'wait' || r.phase === 'read' || r.phase === 'dq') {
      litSl.add(r.s); litMc.add(r.m)
    }
  }

  const st = stats.current
  const bytesOnPins = mcBytes.current.reduce((sum, n) => sum + n, 0)
  const gbs = cyc.current > 0 ? bytesOnPins / (cyc.current * NS_PER_CY) : 0

  return (
    <div className="gsim fullsim">
      <style dangerouslySetInnerHTML={{__html: SIM_CSS + CSS}} />

      <div className="controls">
        <div className="ctl-left">
          <span className="eq">Loading b </span>
        </div>
        <div className="ctl-right">
          <button type="button" className="primary" onClick={togglePlay}>
            {playing ? 'pause' : done ? 'replay ▸' : 'run ▸'}
          </button>
          <button type="button" onClick={reset}>reset</button>
        </div>
      </div>

      <div className="fs-wrap" ref={wrapRef}>
        <div className="fs-die">
          <div className="fs-smrow-lbl fs-lbl">SMs  (128), one pixel per L1 set</div>
          <div className="fs-smgrid">
            {sms.current.map((sm, si) => {
              const busy = sm.warps.some((w) => w.st === 'stalled')
              return <div className={'fs-smcell' + (busy ? ' busy' : '')} data-a={`l1-${si}`} key={si} />
            })}
          </div>

          <div className="fs-band" data-a="xbar"><span className="fs-bandlbl">crossbar</span></div>

          <div className="fs-lbl">L2 (36 slices, 3 per controller), one pixel per set</div>
          <div className="fs-l2band">
            {Array.from({length: NMC}, (_, c) => (
              <div className="fs-group" key={c}>
                {Array.from({length: 3}, (_, b) => {
                  const s = c * 3 + b
                  return <div className={'fs-slice' + (litSl.has(s) ? ' lit' : '')} data-a={`sl-${s}`} key={b} />
                })}
                <div className="fs-slice fused" />
              </div>
            ))}
          </div>

          <div className="fs-lbl">memory controllers (level is instantaneous throughput)</div>
          <div className="fs-mcs">
            {Array.from({length: NMC}, (_, m) => (
              <div className={'fs-mc' + (litMc.has(m) ? ' lit' : '')} data-a={`mc-${m}`} key={m}>
                <div className="fs-mcfill" style={{transform: `scaleY(${mcUtil.current[m]})`}} />
                <span className="fs-mclbl">MC</span>
              </div>
            ))}
          </div>

          <div className="fs-lbl">GDDR6X, 12 chips, 32 banks</div>
          <div className="fs-bankfield">
            {banks.current.map((rowBanks, m) => (
              <div className="fs-bankcol" key={m}>
                {rowBanks.map((k, b) => (
                  <div className={'fs-bank fs-phasebar st-' + k.st} data-a={`bk-${m}-${b}`} key={b} />
                ))}
              </div>
            ))}
          </div>

          <div className="fs-legend">
            <span className="fs-leg"><i className="fs-sw fs-phasebar st-act" /> activate</span>
            <span className="fs-leg"><i className="fs-sw fs-phasebar st-open" /> row open</span>
            <span className="fs-leg"><i className="fs-sw fs-phasebar st-pre" /> precharge</span>
            <span className="fs-leg"><i className="fs-sw fs-phasebar st-ref" /> refresh</span>
          </div>
        </div>
        <canvas className="fs-dots" ref={canvasRef} />
      </div>

      <div className="status">
        <span>
          in flight <span className="n">{inflight.current.length}</span> retired{' '}
          <span className="n">{st.retired}</span> activates{' '}
          <span className="n wide">{st.acts}</span> refreshes{' '}
          <span className="n">{st.refs}</span> GB/s{' '}
          <span className="n">{gbs.toFixed(0)}</span>
        </span>
      </div>
    </div>
  )
}

const CSS = `
.fullsim { --act: var(--accent); }
.fullsim .fs-wrap { position: relative; }
.fullsim .fs-die { border: 1px solid var(--faint); border-radius: 10px; padding: 10px;
  display: flex; flex-direction: column; gap: 6px; }
.fullsim .fs-lbl { font-size: 10px; color: var(--muted); line-height: 1.4; }
.fullsim .fs-lbl.mono { font-family: var(--font-mono); }
.fullsim .fs-smrow-lbl { margin-bottom: 1px; }
.fullsim .fs-smgrid { display: grid; grid-template-columns: repeat(16, 1fr); gap: 2px; }
.fullsim .fs-smcell { position: relative; height: 34px; background: var(--tile-hover); border-radius: 1px; }
.fullsim .fs-smcell.busy { box-shadow: inset 0 0 0 1px var(--accent); }
.fullsim .fs-sm { background: var(--page); border: 1px solid var(--faint);
  border-radius: 5px; padding: 4px; display: flex; flex-direction: column; gap: 4px; }
.fullsim .fs-warps { display: grid; grid-template-columns: repeat(6, 1fr); gap: 2px; }
.fullsim .fs-warp { height: 9px; border-radius: 2px; background: var(--tile); }
.fullsim .fs-warp.ready { background: var(--data); }
.fullsim .fs-warp.stalled { background: var(--tile-hover); }
.fullsim .fs-warp.exec { background: var(--accent-wash); box-shadow: inset 0 0 0 1px var(--accent); }
.fullsim .fs-warp.done { background: var(--tile); }
.fullsim .fs-l1grid { display: grid; grid-template-columns: repeat(32, 1fr); gap: 0; }
.fullsim .fs-l1c { position: relative; height: 4px; background: var(--tile-hover); }
.fullsim .fs-l1c .fill { position: absolute; inset: 0; background: var(--data); }
.fullsim .fs-band { height: 18px; background: var(--tile);
  border-radius: 4px; display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: var(--muted); margin: 2px 0; }
.fullsim .fs-l2band { display: grid; grid-template-columns: repeat(${NMC}, 1fr); gap: 4px; }
.fullsim .fs-group { display: grid; grid-template-rows: repeat(4, 1fr); gap: 3px;
  background: var(--tile); padding: 2px; border-radius: 3px; }
.fullsim .fs-slice { position: relative; height: 15px; background: var(--tile-hover);
  border-radius: 1px; }
.fullsim .fs-slice.fused { background: repeating-linear-gradient(45deg,
  var(--tile-hover), var(--tile-hover) 2px, transparent 2px, transparent 5px); }
.fullsim .fs-slice.lit { box-shadow: 0 0 0 1.5px var(--accent); }
.fullsim .fs-mcs { display: grid; grid-template-columns: repeat(${NMC}, 1fr); gap: 4px; margin-top: 2px; }
.fullsim .fs-mc { position: relative; overflow: hidden; height: 15px; background: var(--tile);
  border-radius: 2px; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 8px; color: var(--muted); }
.fullsim .fs-mcfill { position: absolute; inset: 0; background: var(--accent); opacity: 0.7;
  transform-origin: bottom; }
.fullsim .fs-mclbl { position: relative; z-index: 1; }
.fullsim .fs-mc.lit { box-shadow: 0 0 0 1.5px var(--accent); }
.fullsim .fs-bankfield { display: grid; grid-template-columns: repeat(${NMC}, 1fr); gap: 4px; }
.fullsim .fs-bankcol { display: grid; grid-template-rows: repeat(${NBANK}, 1fr); gap: 1px;
  background: var(--tile); padding: 2px; border-radius: 3px; }
.fullsim .fs-bank { height: 5px; }
.fullsim .fs-phasebar { position: relative; overflow: hidden; border-radius: 1px;
  background:
    linear-gradient(to right,
      transparent 0 calc(33.333% - 0.5px),
      var(--tile) calc(33.333% - 0.5px) calc(33.333% + 0.5px),
      transparent calc(33.333% + 0.5px) calc(66.666% - 0.5px),
      var(--tile) calc(66.666% - 0.5px) calc(66.666% + 0.5px),
      transparent calc(66.666% + 0.5px)),
    var(--tile-hover); }
.fullsim .fs-phasebar::before { content: ''; position: absolute; inset-block: 0;
  width: calc(33.333% - 1px); background: var(--accent); opacity: 0; }
.fullsim .fs-phasebar.st-act::before { left: 0; opacity: 0.65; }
.fullsim .fs-phasebar.st-open::before { left: calc(33.333% + 0.5px); opacity: 0.65; }
.fullsim .fs-phasebar.st-pre::before { left: calc(66.666% + 0.5px); opacity: 0.65; }
.fullsim .fs-phasebar.st-ref::before { left: 0; width: 100%; opacity: 1;
  background: repeating-linear-gradient(45deg,
    var(--muted), var(--muted) 1px, transparent 1px, transparent 3px); }
.fullsim .fs-legend { display: flex; gap: 10px; align-items: center; margin-top: 4px;
  font-size: 9px; color: var(--muted); flex-wrap: wrap; }
.fullsim .fs-leg { display: inline-flex; align-items: center; gap: 3px; }
.fullsim .fs-sw { width: 18px; height: 6px; display: inline-block; }
.fullsim .fs-dots { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
.fullsim .status .n { min-width: 2.5em; margin-right: 0.35em; }
.fullsim .status .n.wide { min-width: 3.5em; }
@media (max-width: 900px) {
  .fullsim .fs-smrow { grid-template-columns: repeat(4, 1fr); }
}
`
