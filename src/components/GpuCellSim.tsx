'use client'

import {useEffect, useRef, useState} from 'react'
import {SIM_CSS} from './gpuread-shared'

// Inside one bank, at the cell level: wordlines across, bitlines down, a
// one-transistor-one-capacitor cell at each crossing, sense amplifiers at the
// foot. Clicking a row activates it — the wordline lights, the gates conduct,
// the row's charge falls down the bitlines, and the amps latch it as the row
// buffer. Clicking another row swaps it (one row open at a time); clicking
// the open row closes it. Schematic: a real bank is 8192 bitlines by 65,536
// wordlines.

const ROWS = 4
const COLS = 6
const ROW_BITS = [
  [1, 0, 1, 1, 0, 0],
  [0, 1, 1, 0, 1, 0],
  [1, 1, 0, 0, 0, 1],
  [0, 0, 1, 0, 1, 1],
]
const WL_Y = [60, 116, 172, 228]
const BL_X = Array.from({length: COLS}, (_, c) => 110 + c * 90)
const AMP_Y = 290
const FLOW_MS = 550

export default function GpuCellSim() {
  const [open, setOpen] = useState<number | null>(null)
  const [phase, setPhase] = useState<'idle' | 'flow' | 'latched'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activate = (r: number) => {
    if (timer.current) clearTimeout(timer.current)
    if (open === r && phase !== 'idle') {
      // precharge: the open row closes, the buffer empties
      setOpen(null)
      setPhase('idle')
      return
    }
    setOpen(r)
    setPhase('flow')
    timer.current = setTimeout(() => setPhase('latched'), FLOW_MS)
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const aria =
    'Inside one bank, drawn as a schematic four-by-six cell array: wordlines ' +
    'run across, bitlines run down to a row of sense amplifiers at the foot, ' +
    'and each crossing holds a one-transistor-one-capacitor cell. Activating ' +
    'a row lights its wordline and opens its gates; the charge falls down the ' +
    'bitlines and the amplifiers latch it as the row buffer. One row is open ' +
    'at a time.'

  return (
    <div className="gsim cellsim">
      <style dangerouslySetInnerHTML={{__html: SIM_CSS + CSS}} />
      <svg viewBox="0 0 680 330" role="img" aria-label={aria}>
        {/* bitlines */}
        {BL_X.map((x) => (
          <line className="bl" x1={x} y1="30" x2={x} y2={AMP_Y} key={x} />
        ))}
        <text className="tag" x={BL_X[0] + 8} y="28">
          bitline
        </text>

        {/* the row decoder */}
        <rect className="unit" x="14" y="40" width="30" height="216" rx="4"></rect>
        <text className="tag" transform="rotate(-90 29 148)" x="29" y="152" textAnchor="middle">
          row decoder
        </text>

        {/* rows: wordline, cells, click target */}
        {WL_Y.map((wy, r) => (
          <g className={'rowg' + (open === r ? ' on' : '')} key={r}>
            <line className="wl" x1="44" y1={wy} x2="640" y2={wy} />
            {BL_X.map((x, c) => (
              <g className="cellg" key={c}>
                {/* access wire from the bitline, with the channel gap */}
                <line className="cw" x1={x} y1={wy + 16} x2={x + 20} y2={wy + 16} />
                <line className="cw" x1={x + 30} y1={wy + 16} x2={x + 38} y2={wy + 16} />
                {/* the gate: hangs off the wordline over the gap */}
                <line className="cw" x1={x + 25} y1={wy} x2={x + 25} y2={wy + 9} />
                <line className="cw gate" x1={x + 19} y1={wy + 9} x2={x + 31} y2={wy + 9} />
                {/* the channel conducts while the row is open */}
                {open === r && <line className="chan" x1={x + 20} y1={wy + 16} x2={x + 30} y2={wy + 16} />}
                {/* the capacitor */}
                <line className="cw plate" x1={x + 38} y1={wy + 8} x2={x + 38} y2={wy + 24} />
                <line className="cw plate" x1={x + 44} y1={wy + 8} x2={x + 44} y2={wy + 24} />
                {/* the far plate is grounded (symbol rotated to face right) */}
                <line className="cw" x1={x + 44} y1={wy + 16} x2={x + 52} y2={wy + 16} />
                <line className="cw" x1={x + 52} y1={wy + 10} x2={x + 52} y2={wy + 22} />
                <line className="cw" x1={x + 55} y1={wy + 12} x2={x + 55} y2={wy + 20} />
                <line className="cw" x1={x + 58} y1={wy + 14} x2={x + 58} y2={wy + 18} />
                {ROW_BITS[r][c] === 1 && (
                  <rect className="chg" x={x + 39.5} y={wy + 10} width="3.5" height="12" />
                )}
              </g>
            ))}
            <rect
              className="hit"
              x="44"
              y={wy - 20}
              width="596"
              height="46"
              role="button"
              tabIndex={0}
              aria-label={`activate row ${r}`}
              onClick={() => activate(r)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') activate(r)
              }}
            />
          </g>
        ))}
        <text className="tag" x="640" y={WL_Y[0] - 10} textAnchor="end">
          wordline
        </text>

        {/* the falling charge */}
        {phase === 'flow' &&
          open != null &&
          BL_X.map((x) => (
            <circle
              key={`${open}-${x}`}
              className="dot"
              cx={x}
              cy={WL_Y[open]}
              r="4"
              style={{'--d': `${AMP_Y - WL_Y[open]}px`} as React.CSSProperties}
            />
          ))}

        {/* sense amplifiers */}
        {BL_X.map((x, c) => (
          <g key={c}>
            <rect
              className={'amp' + (phase === 'latched' ? ' hot' : '')}
              x={x - 16}
              y={AMP_Y}
              width="32"
              height="24"
              rx="4"
            />
            {phase === 'latched' && open != null && (
              <text className="bit" x={x} y={AMP_Y + 16} textAnchor="middle">
                {ROW_BITS[open][c]}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

const CSS = `
.cellsim { margin: 1.75rem 0; }
.cellsim svg { display: block; width: 100%; height: auto; }
.cellsim .bl { stroke: var(--faint); stroke-width: 1.5; opacity: 0.7; }
.cellsim .wl { stroke: var(--faint); stroke-width: 2; opacity: 0.7; }
.cellsim .unit { fill: var(--tile); }
.cellsim .cw { stroke: var(--muted); stroke-width: 1.6; opacity: 0.8; }
.cellsim .cw.gate { stroke-width: 2.4; }
.cellsim .cw.plate { stroke-width: 2.4; }
.cellsim .chan { stroke: var(--accent); stroke-width: 2; }
.cellsim .chg { fill: var(--data); }
.cellsim .hit { fill: transparent; cursor: pointer; }
.cellsim .hit:focus { outline: none; }
.cellsim .rowg:hover .wl { stroke: var(--accent); opacity: 0.45; }
.cellsim .rowg.on .wl { stroke: var(--accent); stroke-width: 2.5; opacity: 1; }
.cellsim .dot { fill: var(--accent); animation: cs-fall ${FLOW_MS}ms linear forwards; }
@keyframes cs-fall { to { transform: translateY(var(--d)); } }
@media (prefers-reduced-motion: reduce) {
  .cellsim .dot { animation-duration: 1ms; }
}
.cellsim .amp { fill: var(--tile); }
.cellsim .amp.hot { fill: var(--data-wash); stroke: var(--accent); stroke-width: 1; }
.cellsim .bit { font-family: var(--font-mono); font-size: 13px; fill: var(--ink); }
.cellsim .tag { font-family: var(--font-sans); font-size: 11.5px; fill: var(--muted); }
`
