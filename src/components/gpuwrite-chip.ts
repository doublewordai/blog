// The whole L2 under a store's afterlife: 128 SMs streaming into 36 slices,
// each slice's 1024 sets run by the recovered replacement policy, dirty lines
// draining through 12 memory controllers to DRAM. A counting model at line
// granularity, paced by the measured rates below; no DOM.
//
// Sets: the same policy as l2set.ts (2-bit RRIP, insert at 1, write-back
// drain buffer one per two fills, the <=8-dirty janitor on stores), specialised
// to streaming kernels -- every access is a miss to a fresh line, so a line's
// age order is its insertion order and no per-line tags are needed. Per set:
// the resident count, how many of the oldest lines sit at RRPV 2, a dirty bit
// per line in age order, the write-back buffer's occupancy, and its drain
// counter. Checked against l2set.ts on random miss streams in the harness.
//
// Addresses: a contiguous sweep, split across SMs the way the kernel's blocks
// are (block b on SM b mod 128, eight lines per block), each line landing in
// the slice the measured slice function picks. Within a slice the sweep is
// dealt to sets round-robin: the campaign's contiguous fills land k-1/k/k+1
// lines per set, i.e. uniformly, and the per-slice set hashes are only
// measured for slice 0.

export const NSM = 128
export const NSLICE = 36
export const NMC = 12
export const SETS = 1024
export const WAYS = 16
export const LINE = 128
export const DIRTY_LIMIT = 8
export const DRAIN_PERIOD = 2

// --- measured rates ---------------------------------------------------------
export const SLICE_PORT_GBS = 51 // one slice's intake for line-scattered stores (fifth pass)
export const SM_PORT_GBS = 84 // one SM's store exit port (stthr.cu)
export const MC_WRITE_GBS = 67 // one controller's DRAM write drain with row locality: 12 x 67 = 800, the sweep asymptote
export const MC_READ_GBS = 84 // one controller's read service, ~1 TB/s across twelve (reads post)
export const L2_ACK_NS = 140 // store ack round trip; loads ~255 ns to DRAM and back
export const DRAM_LAT_NS = 255
export const SM_WARPS = 48 // resident warps: outstanding loads per SM
// --- illustrative, bounded by measurement ---------------------------------
// A controller's write backlog. Stores stall when it is full (fifth pass). Its
// size is set so the 72 MB sweep runs unthrottled (card: 1,843 GB/s) and the
// 128 MB sweep averages ~1,230 (card: 1,226): 2 MB per controller.
export const WQ_LINES = 16384
export const RQ_LINES = 1024 // a controller's read request buffer
// The controller serves reads first and drains writes in batches: it switches
// to writes when the backlog passes the high mark and back when it falls to
// the low mark (the usual write-drain policy; the marks are illustrative).
const WQ_HIGH = Math.floor(WQ_LINES * 0.75)
const WQ_LOW = Math.floor(WQ_LINES * 0.25)

// --- the workload -------------------------------------------------------------
// A kernel writing 128 MB of output (the campaign's 1,226 GB/s sweep: past
// the water-line and into the regime where the controllers' backlog fills and
// the SMs throttle), then a kernel streaming through 96 MB of other input,
// repeating.
export const WRITE_BYTES = 128 * 1_000_000
export const READ_BYTES = 96 * 1_000_000
export const PA_BASE = 0x38ca00000 // where the reads post's b lives; the sweep starts here

export const WATER_LINE_BYTES = DIRTY_LIMIT * SETS * NSLICE * LINE // 37.7 MB

// --- the slice function, in doubles ------------------------------------------
// sim-shared.ts's sliceDigits, without BigInt: physical addresses reach bit 34,
// so a double holds one exactly; the masks split into 32-bit halves.
function par32(x: number): number {
  x ^= x >>> 16
  x ^= x >>> 8
  x ^= x >>> 4
  x ^= x >>> 2
  x ^= x >>> 1
  return x & 1
}
function parMask(lo: number, hi: number, mlo: number, mhi: number): number {
  return par32((lo & mlo) >>> 0) ^ par32((hi & mhi) >>> 0)
}
const A_SHIFT = [5, 0, 1]
const B_OFFSET = [1, 0, 0]
export function sliceOf(pa: number): number {
  const lo = pa % 4294967296 >>> 0
  const hi = Math.floor(pa / 4294967296)
  const p1 = parMask(lo, hi, 0x6a990400, 0x7)
  const p2 = parMask(lo, hi, 0xccf7b000, 0x2)
  const a1 = parMask(lo, hi, 0xc9041000, 0x3)
  const a2 = parMask(lo, hi, 0x882b0800, 0x2)
  const a = (Math.floor(pa / 32768) + 2 * a1 + a2 + 2) % 3
  const g = Math.floor((pa + 65536) / 131072) % 9
  const q0 = par32((lo & 0x8000) >>> 0)
  const q1 = parMask(lo, hi, 0x985e0500, 0x5)
  const q2 = parMask(lo, hi, 0x354e4400, 0x2)
  const q3 = a1
  const G = (((g - A_SHIFT[a]) % 9) + 9) % 9
  const carry = q0 + q1 + q2 >= 2 ? 1 : 0
  const start = (((5 + 7 * q0 + 5 * q1 + 2 * q2 + q3 - carry) % 9) + 9) % 9
  const o = (((G - start) % 9) + 9) % 9
  const lf = (q0 ^ q1 ^ q2) === 0 ? 2 : 1
  const d = Math.floor(o / 3)
  const u = o % 3 >= lf ? 1 : 0
  const base = d === 0 ? 2 : d === 1 && u === 0 ? 1 : 0
  let b = q2 ? (((1 - base) % 3) + 3) % 3 : base
  b = (b + B_OFFSET[a]) % 3
  const controller = (p1 * 2 + p2) * 3 + a
  return controller * 3 + b
}

const POP: Uint8Array = new Uint8Array(65536)
for (let i = 1; i < 65536; i++) POP[i] = POP[i >> 1] + (i & 1)

export type Phase = 'write' | 'read'
export type SmState = 0 | 1 | 2 | 3 // idle/done, issuing, stalled on a store, stalled on a load

export type Frame = {
  intakeGbs: number // bytes into the L2 from the SMs
  writeGbs: number // DRAM writes
  readGbs: number // DRAM reads
}

export class Chip {
  janitor = true
  // per set
  n = new Uint8Array(NSLICE * SETS)
  k = new Uint8Array(NSLICE * SETS)
  bits = new Uint16Array(NSLICE * SETS)
  wb = new Uint8Array(NSLICE * SETS)
  cr = new Uint8Array(NSLICE * SETS)
  nextSet = new Uint16Array(NSLICE)
  // per controller
  wq = new Int32Array(NMC)
  rq = new Int32Array(NMC)
  mcCredit = new Float64Array(NMC)
  mcAlt = new Uint8Array(NMC)
  mcWriteBytes = new Float64Array(NMC) // this step
  mcReadBytes = new Float64Array(NMC)
  // per SM
  smPos = new Int32Array(NSM)
  smState = new Uint8Array(NSM)
  smOut = new Int32Array(NSM) // outstanding loads
  smSlice = new Int16Array(NSM).fill(-1) // slice of the SM's next line, cached per position
  smSlicePos = new Int32Array(NSM).fill(-1)
  // per slice
  portCredit = new Float64Array(NSLICE)
  // workload
  phase: Phase = 'write'
  phaseLines = 0
  phaseBase = 0
  cycles = 0
  // totals
  t = 0 // ns
  dirtyLines = 0
  storedBytes = 0
  writtenBytes = 0
  readBytes = 0
  // loads in flight: completions due per 5 ns bucket, handed back to whichever
  // SMs have loads outstanding (which SM does not change the counts)
  private ret = new Int32Array(64)
  private retHead = 0
  private rot = 0 // rotating start SM for issue and completion hand-out

  constructor(janitor = true) {
    this.janitor = janitor
    this.startPhase('write')
  }

  reset(janitor: boolean) {
    this.janitor = janitor
    this.n.fill(0)
    this.k.fill(0)
    this.bits.fill(0)
    this.wb.fill(0)
    this.cr.fill(0)
    this.nextSet.fill(0)
    this.wq.fill(0)
    this.rq.fill(0)
    this.mcCredit.fill(0)
    this.mcAlt.fill(0)
    this.portCredit.fill(0)
    this.smOut.fill(0)
    this.smSlice.fill(-1)
    this.smSlicePos.fill(-1)
    this.ret.fill(0)
    this.cycles = 0
    this.t = 0
    this.dirtyLines = 0
    this.storedBytes = 0
    this.writtenBytes = 0
    this.readBytes = 0
    this.startPhase('write')
  }

  private startPhase(p: Phase) {
    this.phase = p
    this.phaseLines = (p === 'write' ? WRITE_BYTES : READ_BYTES) / LINE
    this.phaseBase = PA_BASE + (p === 'write' ? 0 : WRITE_BYTES)
    this.smPos.fill(0)
    this.smState.fill(0)
  }

  // the j-th line SM s touches in this phase, or -1 when it has none left
  private lineFor(sm: number, j: number): number {
    const block = sm + NSM * (j >> 3)
    const line = block * 8 + (j & 7)
    return line < this.phaseLines ? line : -1
  }

  // one access to a set; returns the lines it sent to the controller
  setAccess(i: number, store: boolean): number {
    let wbs = 0
    let n = this.n[i]
    let k = this.k[i]
    let bits = this.bits[i]
    let wb = this.wb[i]
    let cr = this.cr[i]
    if (store && this.janitor && POP[bits] >= DIRTY_LIMIT) {
      bits &= bits - 1 // the oldest dirty line, the least recently stored: written back, kept clean
      wbs++
      this.dirtyLines--
    }
    while (n + wb >= WAYS) {
      if (n === 0) {
        wb-- // only buffered lines occupy ways: release the oldest
        continue
      }
      if (k === 0) k = n // nothing at RRPV 2: every line ages
      const dirty = bits & 1 // the victim is the oldest line
      bits >>= 1
      n--
      k--
      if (dirty) {
        wbs++
        wb++ // written back, keeps its way, still readable
        this.dirtyLines--
        continue
      }
      break // a clean victim frees the way
    }
    if (wb === 0) cr = 0
    else {
      cr++
      if (cr >= DRAIN_PERIOD) {
        wb--
        cr = 0
      }
    }
    if (store) {
      bits |= 1 << n
      this.dirtyLines++
    }
    n++
    this.n[i] = n
    this.k[i] = k
    this.bits[i] = bits
    this.wb[i] = wb
    this.cr[i] = cr
    return wbs
  }

  // advance dt nanoseconds
  step(dt: number): Frame {
    const store = this.phase === 'write'
    const perLine = 1 / LINE
    // credits: ports refill each step, capped so idle time does not bank
    const portPer = (SLICE_PORT_GBS * dt) * perLine
    for (let s = 0; s < NSLICE; s++) this.portCredit[s] = Math.min(this.portCredit[s] + portPer, 2 * portPer)
    const mcPer = (MC_WRITE_GBS * dt) * perLine
    for (let c = 0; c < NMC; c++) this.mcCredit[c] = Math.min(this.mcCredit[c] + mcPer, 2 * mcPer)
    const readCost = MC_WRITE_GBS / MC_READ_GBS
    // loads return: the ring holds completions due per 5 ns bucket
    const buckets = Math.max(1, Math.round(dt / 5))
    let due = 0
    for (let b = 0; b < buckets; b++) {
      const idx = (this.retHead + b) & 63
      due += this.ret[idx]
      this.ret[idx] = 0
    }
    this.retHead = (this.retHead + buckets) & 63
    // hand completions back starting from a different SM each step, one per SM
    // per pass, so no SM runs ahead of the others
    this.rot = (this.rot + 37) % NSM
    for (let pass = 0; due > 0 && pass < SM_WARPS; pass++) {
      let gave = false
      for (let i = 0; due > 0 && i < NSM; i++) {
        const sm = (this.rot + i) % NSM
        if (this.smOut[sm] > 0) {
          this.smOut[sm]--
          due--
          gave = true
        }
      }
      if (!gave) break
    }

    // SMs issue, round-robin so the shared ports are shared fairly
    const smPer = store ? Math.ceil((SM_PORT_GBS * dt) * perLine) : NSM
    let intake = 0
    let progress = true
    for (let round = 0; round < smPer && progress; round++) {
      progress = false
      for (let i = 0; i < NSM; i++) {
        const sm = (this.rot + i) % NSM
        const j = this.smPos[sm]
        const line = this.lineFor(sm, j)
        if (line < 0) {
          this.smState[sm] = 0
          continue
        }
        if (!store && this.smOut[sm] >= SM_WARPS) {
          this.smState[sm] = 1 // all warps parked on their loads
          continue
        }
        if (this.smSlicePos[sm] !== j) {
          this.smSlice[sm] = sliceOf(this.phaseBase + line * LINE)
          this.smSlicePos[sm] = j
        }
        const s = this.smSlice[sm]
        const c = (s / 3) | 0
        if (this.portCredit[s] < 1) {
          this.smState[sm] = 1 // waiting for its slice's port this step
          continue
        }
        if (this.wq[c] >= WQ_LINES) {
          // the controller's write backlog is full: a store stalls at the LSU
          // (lg_throttle); a load miss that would evict more dirty lines waits too
          this.smState[sm] = store ? 2 : 3
          continue
        }
        if (!store && this.rq[c] >= RQ_LINES) {
          this.smState[sm] = 3
          continue
        }
        this.portCredit[s] -= 1
        const set = this.nextSet[s]
        this.nextSet[s] = (set + 1) % SETS
        const wbs = this.setAccess(s * SETS + set, store)
        this.wq[c] += wbs
        if (!store) {
          this.rq[c] += 1
          this.smOut[sm]++
        }
        this.smPos[sm] = j + 1
        this.smState[sm] = 1
        intake += LINE
        progress = true
      }
    }
    if (store) this.storedBytes += intake

    // controllers serve their queues
    let writeBytes = 0
    let readBytes = 0
    for (let c = 0; c < NMC; c++) {
      let credit = this.mcCredit[c]
      let w = 0
      let r = 0
      while (credit > 0 && (this.wq[c] > 0 || this.rq[c] > 0)) {
        // write-drain mode: entered at the high mark, left at the low mark
        if (this.wq[c] >= WQ_HIGH) this.mcAlt[c] = 1
        else if (this.wq[c] <= WQ_LOW) this.mcAlt[c] = 0
        const takeRead = this.rq[c] > 0 && (this.mcAlt[c] === 0 || this.wq[c] === 0)
        if (takeRead) {
          this.rq[c]--
          credit -= readCost
          r += LINE
          // the data comes back to its SM after the DRAM round trip
          const due = (this.retHead + Math.max(1, Math.round(DRAM_LAT_NS / 5))) & 63
          this.ret[due]++
        } else {
          this.wq[c]--
          credit -= 1
          w += LINE
        }
      }
      this.mcCredit[c] = credit
      this.mcWriteBytes[c] = w
      this.mcReadBytes[c] = r
      writeBytes += w
      readBytes += r
    }
    this.writtenBytes += writeBytes
    this.readBytes += readBytes
    this.t += dt

    // phase end: every SM has issued its last line (a kernel's grid completes)
    let done = true
    for (let sm = 0; sm < NSM; sm++) {
      if (this.lineFor(sm, this.smPos[sm]) >= 0) {
        done = false
        break
      }
    }
    if (done) {
      if (this.phase === 'read') this.cycles++
      this.startPhase(this.phase === 'write' ? 'read' : 'write')
    }

    return { intakeGbs: intake / dt, writeGbs: writeBytes / dt, readGbs: readBytes / dt }
  }

  // dirty lines resident in the L2, in bytes (nominated-but-unwritten lines are in the controllers' queues)
  dirtyBytes(): number {
    return this.dirtyLines * LINE
  }
  backlogBytes(): number {
    let q = 0
    for (let c = 0; c < NMC; c++) q += this.wq[c]
    return q * LINE
  }
  stalled(): number {
    let n = 0
    for (let sm = 0; sm < NSM; sm++) if (this.smState[sm] >= 2) n++
    return n
  }
}
