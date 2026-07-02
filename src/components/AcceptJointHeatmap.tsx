'use client'

import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { useChartTheme, applyChartDefaults } from './chartTheme'
import {
  ACCEPTANCE_DEFAULT,
  ACCEPTANCE_GROUPS,
  loadAcceptanceData,
  type AcceptanceData,
} from './acceptanceData'

if (typeof window !== 'undefined') {
  Chart.register(...registerables)
}

// Joint distribution of the gate's *predicted* accept length (its per-round
// confidence, ∑_d ∏_{k≤d} conf_k) against the *actual* accept length, as density
// over all rounds, selectable by dataset. Mass concentrates on the diagonal (the
// confidence predicts the outcome: corr 0.82 MTP / 0.86 DFlash on SPEED-Bench)
// with the two corners hottest — (0,0) near-misses and (D,D) clean sweeps — and
// the off-diagonal spread is the gate's per-round uncertainty, i.e. the
// calibration headroom the oracle reaches. Qwen3.6-35B-A3B, temp 0.6;
// M[actual][predicted] = % of rounds, data from acceptanceData.ts.

export default function AcceptJointHeatmap() {
  const mtpRef = useRef<HTMLCanvasElement>(null)
  const dfRef = useRef<HTMLCanvasElement>(null)
  const charts = useRef<Chart[]>([])
  const theme = useChartTheme()
  const [datasetKey, setDatasetKey] = useState(ACCEPTANCE_DEFAULT)
  const [data, setData] = useState<AcceptanceData | null>(null)

  useEffect(() => {
    loadAcceptanceData().then(setData).catch(() => {})
  }, [])

  const MTP = data?.mtp.datasets[datasetKey].heat
  const DF = data?.dflash.datasets[datasetKey].heat
  // Power-scale against the hottest cell in view so the faint diagonal cells stay
  // visible (0.5 = sqrt; lower boosts faint cells harder — the colorbar shows the
  // same mapping).
  const GAMMA = 0.5
  const vmax = MTP && DF ? Math.max(...[...MTP, ...DF].map((row) => Math.max(...row))) : 1
  const fill = (v: number) => {
    const m = Math.min(1, Math.pow(Math.max(0, v) / vmax, GAMMA))
    return `hsla(205, 75%, ${theme.isDark ? 58 : 46}%, ${(0.04 + 0.92 * m).toFixed(3)})`
  }

  useEffect(() => {
    if (!MTP || !DF) return
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

    const build = (canvas: HTMLCanvasElement, M: number[][], showY: boolean): Chart => {
      const D = M.length - 1
      const heatmap = {
        id: 'heatmap',
        beforeDatasetsDraw(chart: Chart) {
          const { ctx, chartArea, scales } = chart
          ctx.save()
          ctx.beginPath()
          ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height)
          ctx.clip()
          for (let a = 0; a <= D; a++) {
            for (let p = 0; p <= D; p++) {
              const xl = scales.x.getPixelForValue(p - 0.5)
              const xr = scales.x.getPixelForValue(p + 0.5)
              const yt = scales.y.getPixelForValue(a + 0.5)
              const yb = scales.y.getPixelForValue(a - 0.5)
              ctx.fillStyle = fill(M[a][p])
              ctx.fillRect(xl, yt, xr - xl + 0.6, yb - yt + 0.6)
            }
          }
          ctx.restore()
        },
      }
      const diagonal = {
        id: 'diagonal',
        afterDatasetsDraw(chart: Chart) {
          const { ctx, scales } = chart
          ctx.save()
          ctx.strokeStyle = theme.mutedForeground
          ctx.setLineDash([4, 4])
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(scales.x.getPixelForValue(-0.5), scales.y.getPixelForValue(-0.5))
          ctx.lineTo(scales.x.getPixelForValue(D + 0.5), scales.y.getPixelForValue(D + 0.5))
          ctx.stroke()
          ctx.restore()
        },
      }
      const tip: { x: number; y: number }[] = []
      for (let a = 0; a <= D; a++) for (let p = 0; p <= D; p++) tip.push({ x: p, y: a })
      return new Chart(canvas, {
        type: 'scatter',
        data: { datasets: [{ label: '', data: tip, pointRadius: 0, pointHitRadius: 10 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: 'nearest', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => {
                  const p = items[0]?.parsed
                  return p ? `predicted ${p.x}, committed ${p.y}` : ''
                },
                label: (ctx) => {
                  const x = ctx.parsed.x
                  const y = ctx.parsed.y
                  if (typeof x !== 'number' || typeof y !== 'number') return ''
                  return `  ${(M[y]?.[x] ?? 0).toFixed(2)}% of rounds`
                },
              },
            },
          },
          scales: {
            x: {
              type: 'linear',
              min: -0.5,
              max: D + 0.5,
              title: axisTitle('predicted accept (confidence)'),
              grid: { display: false },
              ticks: { ...tickStyle, stepSize: D > 8 ? 3 : 2 },
            },
            y: {
              type: 'linear',
              min: -0.5,
              max: D + 0.5,
              title: showY ? axisTitle('actual accept') : { display: false },
              grid: { display: false },
              ticks: { ...tickStyle, stepSize: D > 8 ? 3 : 2, callback: (v) => (showY ? `${v}` : '') },
            },
          },
        },
        plugins: [heatmap, diagonal],
      })
    }

    if (mtpRef.current) charts.current.push(build(mtpRef.current, MTP, true))
    if (dfRef.current) charts.current.push(build(dfRef.current, DF, false))

    return () => {
      charts.current.forEach((c) => c.destroy())
      charts.current = []
    }
  }, [theme, data, datasetKey])

  const selectStyle = {
    fontFamily: theme.fontFamily,
    fontSize: '0.85rem',
    color: theme.foreground,
    background: 'transparent',
    border: `1px solid ${theme.grid}`,
    borderRadius: '0.25rem',
    padding: '0.2rem 0.4rem',
  }

  const panel = (title: string, r: typeof mtpRef) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: theme.foreground }}>
        {title}
      </div>
      <div style={{ position: 'relative', height: '300px' }}>
        <canvas ref={r} />
      </div>
    </div>
  )

  return (
    <div className="my-6">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <select
          value={datasetKey}
          onChange={(e) => setDatasetKey((e.target as HTMLSelectElement).value)}
          style={selectStyle}
        >
          {ACCEPTANCE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {panel('MTP', mtpRef)}
        {panel('DFlash', dfRef)}
      </div>
      {data && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.4rem',
            marginTop: '0.4rem',
            fontSize: '0.75rem',
            color: theme.mutedForeground,
          }}
        >
          <span>% of rounds</span>
          <span>0</span>
          <div
            style={{
              width: '120px',
              height: '10px',
              border: `1px solid ${theme.grid}`,
              borderRadius: '2px',
              background: `linear-gradient(to right, ${Array.from(
                { length: 11 },
                (_, i) => `${fill((vmax * i) / 10)} ${i * 10}%`
              ).join(', ')})`,
            }}
          />
          <span>{vmax >= 10 ? vmax.toFixed(0) : vmax.toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}
