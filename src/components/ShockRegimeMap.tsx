'use client'

import {useEffect, useRef, useState} from 'react'
import {Chart, registerables} from 'chart.js'
import {useChartTheme, applyChartDefaults} from './chartTheme'

if (typeof window !== 'undefined') {
  Chart.register(...registerables)
}

// The trackable-balance condition as a cell heatmap over the shock plane,
// in the style of AcceptJointHeatmap. A mix step of size δ (x, signed)
// opens against a fixed flow P and persists; the resize lands after τ (y).
// The inter-pool queue has capacity C and occupancy Q0: a shortfall (δ < 0)
// drains the stock Q0, a surplus (δ > 0) fills the headroom C − Q0. The queue
// hits an end after
//   T_hit = Q0/(−δ)        (δ < 0)
//         = (C − Q0)/δ     (δ > 0)
// and the average stranded flow over the window [0, τ], as a fraction of the
// balanced flow P, is
//   L(δ, τ) = (|δ|/P) · max(0, 1 − T_hit/τ).
// L = 0 below the boundaries τ = T_hit. Orange on the shortfall side (decode
// output lost), blue on the surplus side (prefill backpressured); alpha rises
// with loss and saturates at 50%.

// Per prefill GPU, at the fabric section's roofline flow: GLM-5.2 on a B200,
// 4.5 PFLOP/s / (2 x 40e9) = 56,250 tok/s x 95 KB/token of stored KV.
const P = 5.34 // GB/s per prefill GPU
const D_MAX = 5.34 // GB/s per prefill GPU
const TAU_MAX = 1800 // s
const L_SAT = 0.5
const GAMMA = 0.75
const D_BINS = 48 // across the full signed range
const TAU_BINS = 30

export default function ShockRegimeMap() {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const theme = useChartTheme()

  const [cap, setCap] = useState(150) // C, GB per prefill GPU
  const [occ, setOcc] = useState(50) // Q0/C, percent

  const q0 = (cap * occ) / 100

  const tHit = (d: number) => (d < 0 ? q0 / -d : (cap - q0) / d)

  const loss = (d: number, tau: number) => {
    if (d === 0) return 0
    const t = tHit(d)
    return tau > t ? (Math.abs(d) / P) * (1 - t / tau) : 0
  }

  const fill = (L: number, d: number) => {
    const m = Math.min(1, Math.pow(L / L_SAT, GAMMA))
    const hue = d < 0 ? 25 : 205
    return `hsla(${hue}, 75%, ${theme.isDark ? 58 : 46}%, ${(0.04 + 0.92 * m).toFixed(3)})`
  }

  useEffect(() => {
    if (!chartRef.current) return
    chartInstance.current?.destroy()
    applyChartDefaults(theme)

    const dStep = (2 * D_MAX) / D_BINS
    const tStep = TAU_MAX / TAU_BINS

    const shortfallColor = `hsl(25, 75%, ${theme.isDark ? 65 : 38}%)`
    const surplusColor = `hsl(205, 75%, ${theme.isDark ? 65 : 38}%)`
    const side = (sign: 1 | -1) => {
      const pts: {x: number; y: number}[] = []
      for (let i = 1; i <= 300; i++) {
        const d = sign * (i / 300) * D_MAX
        pts.push({x: d, y: Math.min(TAU_MAX, tHit(d))})
      }
      return sign < 0 ? pts.reverse() : pts
    }

    const hits: {x: number; y: number}[] = []
    for (let i = 0; i < D_BINS; i++)
      for (let j = 0; j < TAU_BINS; j++)
        hits.push({x: -D_MAX + (i + 0.5) * dStep, y: (j + 0.5) * tStep})

    const heatmap = {
      id: 'heatmap',
      beforeDatasetsDraw(chart: Chart) {
        const {ctx, chartArea, scales} = chart
        ctx.save()
        ctx.beginPath()
        ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height)
        ctx.clip()
        for (let i = 0; i < D_BINS; i++) {
          for (let j = 0; j < TAU_BINS; j++) {
            const xl = scales.x.getPixelForValue(-D_MAX + i * dStep)
            const xr = scales.x.getPixelForValue(-D_MAX + (i + 1) * dStep)
            const yt = scales.y.getPixelForValue((j + 1) * tStep)
            const yb = scales.y.getPixelForValue(j * tStep)
            const d = -D_MAX + (i + 0.5) * dStep
            ctx.fillStyle = fill(loss(d, (j + 0.5) * tStep), d)
            ctx.fillRect(xl, yt, xr - xl + 0.6, yb - yt + 0.6)
          }
        }
        ctx.restore()
      },
    }

    const axisTitle = (text: string) => ({
      display: true,
      text,
      color: theme.mutedForeground,
      font: {family: theme.fontFamily},
    })
    const tickStyle = {color: theme.mutedForeground, font: {family: theme.fontFamily}}

    chartInstance.current = new Chart(chartRef.current, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'hits',
            data: hits,
            pointRadius: 0,
            pointHitRadius: 8,
          },
          {
            label: 'shortfall boundary',
            type: 'line',
            data: side(-1),
            borderColor: shortfallColor,
            pointRadius: 0,
            pointHitRadius: 0,
            tension: 0,
            borderWidth: 2,
          },
          {
            label: 'surplus boundary',
            type: 'line',
            data: side(1),
            borderColor: surplusColor,
            pointRadius: 0,
            pointHitRadius: 0,
            tension: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {mode: 'nearest', intersect: false},
        plugins: {
          legend: {display: false},
          tooltip: {
            filter: (item) => item.datasetIndex === 0,
            callbacks: {
              title: (items) => {
                const p = items[0]?.parsed
                return p && typeof p.x === 'number' && typeof p.y === 'number'
                  ? `δ ${p.x.toFixed(2)} GB/s, τ ${Math.round(p.y)} s`
                  : ''
              },
              label: (ctx) => {
                const x = ctx.parsed.x
                const y = ctx.parsed.y
                if (typeof x !== 'number' || typeof y !== 'number') return ''
                const L = loss(x, y)
                if (L <= 0) return '  absorbed'
                return x < 0
                  ? `  ${(L * 100).toFixed(0)}% of decode output lost over the window`
                  : `  ${(L * 100).toFixed(0)}% of prefill flow backpressured over the window`
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: -D_MAX,
            max: D_MAX,
            title: axisTitle('mix step δ (GB/s per prefill GPU)'),
            grid: {display: false},
            ticks: {...tickStyle, stepSize: 1},
          },
          y: {
            type: 'linear',
            min: 0,
            max: TAU_MAX,
            title: axisTitle('cold start time τ (s)'),
            grid: {display: false},
            ticks: {...tickStyle, stepSize: 300},
          },
        },
      },
      plugins: [heatmap],
    })

    return () => {
      chartInstance.current?.destroy()
      chartInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, cap, occ])

  const gradient = (hue: number, dir: string) =>
    `linear-gradient(${dir}, ${Array.from(
      {length: 11},
      (_, i) =>
        `hsla(${hue}, 75%, ${theme.isDark ? 58 : 46}%, ${(
          0.04 +
          0.92 * Math.min(1, Math.pow(i / 10, GAMMA))
        ).toFixed(3)}) ${i * 10}%`
    ).join(', ')})`

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.85rem',
    color: theme.foreground,
  }
  const swatchStyle = (hue: number, dir: string): React.CSSProperties => ({
    width: '120px',
    height: '10px',
    border: `1px solid ${theme.grid}`,
    borderRadius: '2px',
    background: gradient(hue, dir),
  })

  return (
    <div className="my-6">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.6rem 1.5rem',
          justifyContent: 'flex-start',
          marginBottom: '0.5rem',
        }}
      >
        <label style={labelStyle}>
          <span>{`capacity C = ${cap} GB per prefill GPU`}</span>
          <input
            type="range"
            min={25}
            max={500}
            step={25}
            value={cap}
            style={{width: '8rem'}}
            onChange={(e) => setCap(Number(e.target.value))}
          />
        </label>
        <label style={labelStyle}>
          <span>{`occupancy Q₀/C = ${occ}%`}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={occ}
            style={{width: '8rem'}}
            onChange={(e) => setOcc(Number(e.target.value))}
          />
        </label>
      </div>
      <div style={{position: 'relative', height: '340px'}}>
        <canvas ref={chartRef} />
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.4rem',
          marginTop: '0.4rem',
          fontSize: '0.75rem',
          color: theme.mutedForeground,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
          <span>≥50%</span>
          <div style={swatchStyle(25, 'to left')} />
          <span>0</span>
          <span>decode output lost</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
          <span>prefill backpressured</span>
          <span>0</span>
          <div style={swatchStyle(205, 'to right')} />
          <span>≥50%</span>
        </div>
      </div>
    </div>
  )
}
