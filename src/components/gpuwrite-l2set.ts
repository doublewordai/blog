// One L2 set of the RTX 4090, as recovered by the owned-set probe
// (~/scratch/nvemu-l2-victim, 2026-08-25) and the writes campaign's dirty-line
// rule (2026-08-19). A line-granular port of nvemu's `L2Cache::access`
// (crates/nvemu-mem/src/cache.rs @ af933c5): the figure runs this model, and
// the test harness beside it checks the port against the same card laws the
// Rust regression tests assert.
//
// Per line: a 2-bit RRPV in {0,1,2}, a dirty bit, and stamps for the last use
// (RRIP tiebreak) and the last store (the <=8-dirty rule's victim order).
//
//   insert (miss)  rrpv = 1, load or store alike; a store also sets dirty
//   hit            rrpv = 0; a store-hit sets dirty
//   victim         a line at rrpv 2, the oldest by last use; if none is at 2,
//                  age every line by one and rescan
//   dirty victim   written back but NOT evicted: it moves into the set's
//                  write-back buffer, keeps its way, stays readable, and the
//                  scan continues until it finds a clean line to evict
//   drain          every second fill, while the buffer is non-empty, the oldest
//                  buffered line leaves and frees its way
//   janitor        a store into a set already holding `dirtyLimit` dirty lines
//                  first cleans the least-recently-stored dirty line (kept
//                  resident). If the store targets that very line, the store
//                  is written through and the line is left clean.

export const WAYS = 16
export const DIRTY_LIMIT = 8
export const MAX_RRPV = 2
export const DRAIN_PERIOD = 2

export type Line = {
  tag: string
  rrpv: number
  dirty: boolean
  lastUse: number
  lastStore: number
}

export type SetState = {
  lines: Line[]
  wb: string[] // write-back buffer, oldest first; each entry still occupies a way
  credit: number // fills counted toward the next drain
  stamp: number
  janitor: boolean
  fills: number
  writebacks: number
}

export type Ev =
  | { k: 'hit'; tag: string; store: boolean }
  | { k: 'wbhit'; tag: string; store: boolean }
  | { k: 'clean'; tag: string; through: boolean }
  | { k: 'miss'; tag: string }
  | { k: 'age' }
  | { k: 'victim'; tag: string; dirty: boolean }
  | { k: 'drain'; tag: string }
  | { k: 'insert'; tag: string; store: boolean }

export function newSet(janitor = true): SetState {
  return { lines: [], wb: [], credit: 0, stamp: 0, janitor, fills: 0, writebacks: 0 }
}

export function occupancy(s: SetState): number {
  return s.lines.length + s.wb.length
}

export function dirtyCount(s: SetState): number {
  return s.lines.filter((l) => l.dirty).length
}

export function isResident(s: SetState, tag: string): boolean {
  return s.lines.some((l) => l.tag === tag) || s.wb.includes(tag)
}

function argmin<T>(xs: T[], key: (x: T) => number): number {
  let best = -1
  let bestKey = Infinity
  xs.forEach((x, i) => {
    const k = key(x)
    if (k < bestKey) {
      bestKey = k
      best = i
    }
  })
  return best
}

// Make room for one fill. Mirrors `L2Cache::free_way`.
function freeWay(s: SetState, ev: Ev[]) {
  while (occupancy(s) >= WAYS) {
    if (s.lines.length === 0) {
      // only buffered lines occupy ways; release the oldest
      const t = s.wb.shift()!
      ev.push({ k: 'drain', tag: t })
      continue
    }
    let victim = -1
    for (;;) {
      const atMax = s.lines.map((l, i) => (l.rrpv >= MAX_RRPV ? i : -1)).filter((i) => i >= 0)
      if (atMax.length) {
        victim = atMax[argmin(atMax, (i) => s.lines[i].lastUse)]
        break
      }
      for (const l of s.lines) l.rrpv = Math.min(MAX_RRPV, l.rrpv + 1)
      ev.push({ k: 'age' })
    }
    const v = s.lines[victim]
    if (v.dirty) {
      s.writebacks++
      ev.push({ k: 'victim', tag: v.tag, dirty: true })
      s.lines.splice(victim, 1)
      s.wb.push(v.tag) // keeps its way; occupancy unchanged, keep searching
      continue
    }
    ev.push({ k: 'victim', tag: v.tag, dirty: false })
    s.lines.splice(victim, 1)
    return
  }
}

// One drain step per fill. Mirrors `L2Cache::drain`.
function drain(s: SetState, ev: Ev[]) {
  if (s.wb.length === 0) {
    s.credit = 0
    return
  }
  s.credit += 1
  if (s.credit >= DRAIN_PERIOD) {
    const t = s.wb.shift()!
    s.credit = 0
    ev.push({ k: 'drain', tag: t })
  }
}

// One access to the set. Mutates `s`; returns what happened, in order.
export function access(s: SetState, tag: string, store: boolean): Ev[] {
  const ev: Ev[] = []
  s.stamp += 1
  const stamp = s.stamp

  // the <=8-dirty janitor, stores only
  if (store && s.janitor && dirtyCount(s) >= DIRTY_LIMIT) {
    const dirtyIdx = s.lines.map((l, i) => (l.dirty ? i : -1)).filter((i) => i >= 0)
    const idx = dirtyIdx[argmin(dirtyIdx, (i) => s.lines[i].lastStore)]
    const l = s.lines[idx]
    if (l.tag === tag) {
      // write-through: the store's bytes go straight on, the line stays clean
      l.rrpv = 0
      l.lastUse = stamp
      l.lastStore = stamp
      l.dirty = false
      s.writebacks++
      ev.push({ k: 'clean', tag: l.tag, through: true })
      return ev
    }
    l.dirty = false
    s.writebacks++
    ev.push({ k: 'clean', tag: l.tag, through: false })
  }

  // resident hit
  const hit = s.lines.find((l) => l.tag === tag)
  if (hit) {
    hit.rrpv = 0
    hit.lastUse = stamp
    if (store) {
      hit.dirty = true
      hit.lastStore = stamp
    }
    ev.push({ k: 'hit', tag, store })
    return ev
  }

  // hit on a line still readable in the write-back buffer: re-allocates as a
  // resident line at rrpv 0, clean unless this access dirties it. Occupancy
  // is unchanged, so nothing is evicted.
  const wbPos = s.wb.indexOf(tag)
  if (wbPos >= 0) {
    s.wb.splice(wbPos, 1)
    s.lines.push({ tag, rrpv: 0, dirty: store, lastUse: stamp, lastStore: store ? stamp : 0 })
    ev.push({ k: 'wbhit', tag, store })
    return ev
  }

  // miss: free a way, drain, insert at rrpv 1
  ev.push({ k: 'miss', tag })
  freeWay(s, ev)
  drain(s, ev)
  s.fills += 1
  s.lines.push({ tag, rrpv: 1, dirty: store, lastUse: stamp, lastStore: store ? stamp : 0 })
  ev.push({ k: 'insert', tag, store })
  return ev
}

// --- the survival probe (victim.cu / cascade.py), run silently ------------
// own 16 lines by loads; insert D targets (each a load or a store); stream
// fresh loads; S* is the number of streamed lines at which target `rb` is
// first no longer resident.
export function survival(ops: boolean[], rb: number, janitor = true, limit = 80): number {
  for (let S = 0; S <= limit; S++) {
    const s = newSet(janitor)
    for (let r = 0; r < WAYS; r++) access(s, `o${r}`, false)
    ops.forEach((st, j) => access(s, `t${j}`, st))
    for (let k = 0; k < S; k++) access(s, `s${k}`, false)
    if (!isResident(s, `t${rb}`)) return S
  }
  return limit
}
