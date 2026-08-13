// Shared between the gpuread figures: the measured address functions (the L1
// set index and the L2 slice function from the appendix), the addresses the
// post's `b` lives at, and the visual language — color tokens, the control
// row, the address-bit strip, and the status line. CSS rules here target
// .gsim; each component adds its own structural CSS under its own class.

export function parityBits(x: bigint): number {
  let p = 0
  while (x) {
    p ^= Number(x & 1n)
    x >>= 1n
  }
  return p
}

// --- where b lives ---------------------------------------------------------
export const B_BASE = 0x200000000n // virtual
export const PA_BASE = 0x38ca00000n // physical: one contiguous run
export const B_FLOATS = 1048576 // n = 4096 blocks x 256 threads
export const LINE = 128n

// --- the L1 set index: each of the 8 bits is the XOR of the address bits its
// mask selects. Masks recovered in the appendix. --------------------------
export const L1_MASKS: bigint[] = [
  0xc3901e00n,
  0x119a80a00n,
  0x167041b00n,
  0xdbc21d80n,
  0x47810400n,
  0x1b4e09180n,
  0xb6405400n,
  0xdc202c80n,
]

export function l1SetIndexBits(a: bigint): number[] {
  return L1_MASKS.map((m) => parityBits(a & m))
}

export function l1SetIndex(a: bigint): number {
  return l1SetIndexBits(a).reduce((v, b, i) => v | (b << i), 0)
}

// --- the L2 slice function (appendix): four digits over the physical
// address. P1 and P2 are parities of masked bits; A is mod-3 arithmetic with
// two parity corrections; B reads a nine-position cycle at an offset set by
// four more parities. slice = ((P1*2 + P2)*3 + A)*3 + B. -------------------
export const P1_MASK = 0x76a990400n
export const P2_MASK = 0x2ccf7b000n
const A_MASK1 = 0x3c9041000n
const A_MASK2 = 0x2882b0800n
const Q0_MASK = 0x8000n
const Q1_MASK = 0x5985e0500n
const Q2_MASK = 0x2354e4400n
const Q3_MASK = 0x3c9041000n
const A_SHIFT = [5, 0, 1]
const B_OFFSET = [1, 0, 0]

export type SliceDigits = { p1: number; p2: number; a: number; b: number; slice: number }

export function sliceDigits(addr: bigint): SliceDigits {
  const p1 = parityBits(addr & P1_MASK)
  const p2 = parityBits(addr & P2_MASK)
  const a = Number(
    ((addr >> 15n) + BigInt(2 * parityBits(addr & A_MASK1) + parityBits(addr & A_MASK2) + 2)) % 3n
  )
  const g = Number(((addr + (1n << 16n)) >> 17n) % 9n)
  const q0 = parityBits(addr & Q0_MASK)
  const q1 = parityBits(addr & Q1_MASK)
  const q2 = parityBits(addr & Q2_MASK)
  const q3 = parityBits(addr & Q3_MASK)
  const G = (((g - A_SHIFT[a]) % 9) + 9) % 9
  const carry = q0 + q1 + q2 >= 2 ? 1 : 0
  const start = (((5 + 7 * q0 + 5 * q1 + 2 * q2 + q3 - carry) % 9) + 9) % 9
  const o = ((G - start) % 9 + 9) % 9
  const lf = (q0 ^ q1 ^ q2) === 0 ? 2 : 1
  const d = Math.floor(o / 3)
  const u = o % 3 >= lf ? 1 : 0
  const base = d === 0 ? 2 : d === 1 && u === 0 ? 1 : 0
  let b = q2 ? (((1 - base) % 3) + 3) % 3 : base
  b = (b + B_OFFSET[a]) % 3
  const controller = (p1 * 2 + p2) * 3 + a
  return { p1, p2, a, b, slice: controller * 3 + b }
}
//
// The palette carries two meanings everywhere: --data (blue) is data at rest,
// --accent (warm) is the load we're following. Mono is for machine data only;
// labels and buttons are the site sans.
export const SIM_CSS = `
.gsim {
  --ink: #2a2a2a; --muted: #6f6f6f; --faint: #b0b0b0;
  --page: #ffffff; --tile-solid: #f3f3f3;
  --tile: rgba(12,12,12,0.05); --tile-hover: rgba(12,12,12,0.1);
  --data: #a8c7e4; --data-wash: rgba(168,199,228,0.35);
  --accent: #b5532a; --accent-wash: rgba(181,83,42,0.13);
  font-family: var(--font-sans); font-size: 13px; color: var(--muted);
  font-variant-numeric: tabular-nums;
  margin: 1.75rem 0;
}
.dark .gsim, [data-theme='dark'] .gsim {
  --ink: #e2e2e2; --muted: #9d9d9d; --faint: #606060;
  --page: #2b2b2b; --tile-solid: #3a3a3a;
  --tile: rgba(250,250,250,0.07); --tile-hover: rgba(250,250,250,0.13);
  --data: #46608c; --data-wash: rgba(70,96,140,0.45);
  --accent: #d4763f; --accent-wash: rgba(212,118,63,0.18);
}
.gsim .row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.gsim .controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  margin-bottom: 1rem; }
.gsim .ctl-left { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.gsim .ctl-right { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; }
.gsim label { font-family: var(--font-mono); font-size: 12.5px; color: var(--muted);
  display: flex; align-items: center; gap: 0.15rem; }
.gsim input { font-family: var(--font-mono); font-size: 12.5px; width: 6em; padding: 2px 6px;
  border: 1px solid var(--faint); border-radius: 4px; background: transparent; color: var(--ink); }
.gsim input:focus { outline: none; border-color: var(--muted); }
.gsim button { font-family: var(--font-sans); font-size: 12.5px; padding: 3px 12px; border: none;
  border-radius: 5px; background: var(--tile); color: var(--muted);
  cursor: pointer; user-select: none; touch-action: manipulation;
  -webkit-tap-highlight-color: transparent; }
.gsim button.primary { background: var(--accent-wash); color: var(--accent); }
.gsim button:disabled { opacity: 0.4; cursor: default; }
.gsim button:hover:not(:disabled) { background: var(--tile-hover); }
.gsim button.primary:hover:not(:disabled) { background: var(--accent-wash); }
.gsim .bits-scroll { overflow-x: auto; overflow-y: hidden; }
.gsim .bitrow { display: flex; gap: 1px; width: max-content; }
.gsim .bitcol { display: flex; flex-direction: column; align-items: center; }
.gsim .bitcol.gap { margin-right: 8px; }
.gsim .bit { width: 13px; height: 18px; line-height: 18px; text-align: center;
  font-family: var(--font-mono); font-size: 11.5px; border-radius: 3px; color: var(--faint); }
.gsim .bit.on { color: var(--ink); }
.gsim .bit.off { opacity: 0.45; }
.gsim .bit.inmask { background: var(--accent-wash); color: var(--accent); }
.gsim .bitlabel { font-family: var(--font-mono); font-size: 9px; color: var(--faint); height: 12px; }
.gsim .idxrow { margin: 0.3rem 0 1.25rem; }
.gsim .lbl { font-size: 12.5px; color: var(--muted); margin-right: 0.2rem; white-space: nowrap; }
.gsim .eq { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
.gsim .gridlabels { display: flex; justify-content: space-between;
  font-size: 11px; color: var(--faint); margin-top: 3px; }
.gsim .status { display: flex; justify-content: flex-end; gap: 1rem;
  font-size: 12.5px; color: var(--muted); margin-top: 0.9rem; flex-wrap: wrap; }
.gsim .status .n { display: inline-block; min-width: 3em;
  font-family: var(--font-mono); font-size: 12px; color: var(--ink); }
`
