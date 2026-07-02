'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { useChartTheme, applyChartDefaults } from './chartTheme'

if (typeof window !== 'undefined') {
  Chart.register(...registerables)
}

// Where confidence gating's value comes from, as % goodput over the homogeneous
// priced policy (the envelope, the zero line). Three nested rungs, drawn as
// stacked bands so each band IS one finding: the usable one-width signal
// (homog→realizable), the per-sequence raggedness on top (realizable→ragged),
// and the calibration headroom a perfect gate would still reach (ragged→oracle).
// Two heads, both at D=16: both ragged the verify (the common lever); MTP, being
// autoregressive, additionally raggeds the draft (its per-sequence depth sets
// draft and verify together), while DFlash's fixed block can only ragged the
// verify. The middle band is thin for MTP, fat for DFlash — the F8 asymmetry.
// DFlash gating dies past conc ~16, where its homogeneous policy is already
// optimal; MTP's decays more gradually (ragged still +3-7% at conc 16-64), and
// both revive a little at 1024+. Qwen3.6-35B-A3B / B200 TP1/EP1, decode-only;
// output of examples/spec_gating_ladder.rs in inference-lab.

const CONC = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]

// raw Δ% over homogeneous: [realizable, ragged, oracle]
const MTP = {
  realiz: [24.8, 9.0, 7.4, 11.8, 3.5, 1.6, 0.9, 0.7, 0.0, 0.2, 0.1, 0.0],
  ragged: [24.8, 11.9, 11.6, 19.1, 7.2, 4.5, 3.2, 1.3, 0.1, 0.3, 1.4, 3.6],
  oracle: [43.0, 23.4, 24.2, 34.9, 21.3, 11.7, 9.4, 6.5, 3.1, 0.5, 4.7, 9.9],
}
const DFLASH = {
  realiz: [38.5, 21.2, 15.6, 12.4, 0.0, 0.0, 0.1, 0.0, 0.0, -0.1, -0.1, -0.8],
  ragged: [38.4, 33.1, 27.1, 23.3, 0.2, -0.3, 0.0, -0.1, 0.0, 0.8, 2.4, 1.3],
  oracle: [61.6, 51.7, 44.5, 42.9, 12.9, 1.6, 0.3, 0.2, 0.2, 1.8, 5.0, 13.2],
}

// Clamp into nested, non-negative rungs so the bands stack cleanly (a couple of
// sub-0.5% crossings at large batch would otherwise invert a band).
function nest(d: { realiz: number[]; ragged: number[]; oracle: number[] }) {
  const r1 = d.realiz.map((v) => Math.max(0, v))
  const r2 = d.ragged.map((v, i) => Math.max(r1[i], v))
  const r3 = d.oracle.map((v, i) => Math.max(r2[i], v))
  return [r1, r2, r3]
}

// Three stacked layers of "gain over the envelope", by what it takes to capture
// each: a one-width gate (realizable today), then ragged per-sequence widths (a
// kernel), then perfect calibration (the unreachable ceiling).
const BANDS = [
  { key: 'one-width gate', hue: '220, 70%' },
  { key: '+ ragged widths', hue: '28, 85%' },
  { key: '+ perfect calibration', hue: '265, 40%' },
]

export default function GatingLadder() {
  const mtpRef = useRef<HTMLCanvasElement>(null)
  const dfRef = useRef<HTMLCanvasElement>(null)
  const charts = useRef<Chart[]>([])
  const theme = useChartTheme()

  useEffect(() => {
    charts.current.forEach((c) => c.destroy())
    charts.current = []
    applyChartDefaults(theme)

    const axisTitle = (text: string) => ({
      display: true,
      text,
      color: theme.mutedForeground,
      font: { family: theme.fontFamily },
    })
    const tickStyle = { color: theme.mutedForeground, font: { family: theme.fontFamily } }

    const build = (
      canvas: HTMLCanvasElement,
      rungs: number[][],
      showY: boolean,
    ): Chart => {
      const ds = (i: number) => {
        const bg = `hsla(${BANDS[i].hue}, ${theme.isDark ? 58 : 52}%, ${i === 2 ? 0.32 : 0.55})`
        const line = `hsl(${BANDS[i].hue}, ${theme.isDark ? 64 : 46}%)`
        return {
          label: BANDS[i].key,
          data: rungs[i].map((y, j) => ({ x: CONC[j], y })),
          backgroundColor: bg,
          borderColor: line,
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.25,
          fill: i === 0 ? 'origin' : '-1',
        }
      }
      return new Chart(canvas, {
        type: 'line',
        data: { datasets: [ds(0), ds(1), ds(2)] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => (items.length ? `concurrency ${items[0].parsed.x}` : ''),
                // Each band's own thickness (its layer of gain), not the cumulative.
                label: (ctx) => {
                  const i = ctx.datasetIndex
                  const j = ctx.dataIndex
                  const inc = rungs[i][j] - (i > 0 ? rungs[i - 1][j] : 0)
                  return `  ${ctx.dataset.label}: +${inc.toFixed(0)}%`
                },
              },
            },
          },
          scales: {
            x: {
              type: 'logarithmic',
              min: 1,
              max: 2048,
              title: axisTitle('decode batch B (concurrency)'),
              grid: { color: theme.grid },
              afterBuildTicks: (axis) => {
                axis.ticks = CONC.map((v) => ({ value: v }))
              },
              ticks: { ...tickStyle, callback: (v) => `${v}` },
            },
            y: {
              type: 'linear',
              min: 0,
              max: 60,
              title: showY ? axisTitle('goodput over the envelope (%)') : { display: false },
              grid: { color: theme.grid },
              ticks: { ...tickStyle, callback: (v) => (showY ? `${v}%` : ''), stepSize: 15 },
            },
          },
        },
      })
    }

    if (mtpRef.current) charts.current.push(build(mtpRef.current, nest(MTP), true))
    if (dfRef.current) charts.current.push(build(dfRef.current, nest(DFLASH), false))

    return () => {
      charts.current.forEach((c) => c.destroy())
      charts.current = []
    }
  }, [theme])

  const panel = (title: string, r: typeof mtpRef) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: theme.foreground }}>
        {title}
      </div>
      <div style={{ position: 'relative', height: '320px' }}>
        <canvas ref={r} />
      </div>
    </div>
  )

  return (
    <div className="my-6">
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {panel('MTP — ragged verify + draft', mtpRef)}
        {panel('DFlash — ragged verify only', dfRef)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
        {BANDS.map((b) => (
          <span
            key={b.key}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: theme.mutedForeground }}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                background: `hsla(${b.hue}, ${theme.isDark ? 58 : 52}%, ${b.key === 'calibration headroom' ? 0.32 : 0.55})`,
              }}
            />
            {b.key}
          </span>
        ))}
      </div>
    </div>
  )
}
