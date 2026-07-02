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

// Distribution of accept lengths (tokens committed per round) for each head,
// selectable by dataset. The shape is what the per-depth average hides: a decay
// from zero plus a spike at the deepest draft, the censoring spike of rounds the
// drafter got entirely right where only the draft length stopped it. A round is
// mostly a near-miss or a clean sweep, which is the variation the confidence
// signal sorts out. Qwen3.6-35B-A3B, temp 0.6; data from acceptanceData.ts.

export default function AcceptLengthHist() {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const theme = useChartTheme()
  const [datasetKey, setDatasetKey] = useState(ACCEPTANCE_DEFAULT)
  const [data, setData] = useState<AcceptanceData | null>(null)

  useEffect(() => {
    loadAcceptanceData().then(setData).catch(() => {})
  }, [])

  useEffect(() => {
    if (!chartRef.current || !data) return
    chartInstance.current?.destroy()
    applyChartDefaults(theme)

    const mtpHist = data.mtp.datasets[datasetKey].hist
    const dfHist = data.dflash.datasets[datasetKey].hist
    const commits = Array.from(
      { length: Math.max(data.mtp.width, data.dflash.width) + 1 },
      (_, i) => i
    )

    const mtp = `hsla(220, 70%, ${theme.isDark ? 62 : 48}%, 0.85)`
    const df = `hsla(28, 80%, ${theme.isDark ? 60 : 50}%, 0.85)`
    const axisTitle = (text: string) => ({
      display: true,
      text,
      color: theme.mutedForeground,
      font: { family: theme.fontFamily },
    })
    const tickStyle = { color: theme.mutedForeground, font: { family: theme.fontFamily } }

    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: commits.map((c) => `${c}`),
        datasets: [
          {
            label: `MTP (D=${data.mtp.width})`,
            data: commits.map((c) => mtpHist[c] ?? null),
            backgroundColor: mtp,
            borderWidth: 0,
          },
          {
            label: `DFlash (D=${data.dflash.width})`,
            data: commits.map((c) => dfHist[c] ?? null),
            backgroundColor: df,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 14, boxHeight: 12, color: theme.foreground, font: { family: theme.fontFamily } },
          },
          tooltip: {
            callbacks: {
              title: (items) => (items.length ? `${items[0].label} tokens committed` : ''),
              label: (ctx) => `  ${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}% of rounds`,
            },
          },
        },
        scales: {
          x: {
            title: axisTitle('tokens committed in the round'),
            grid: { display: false },
            ticks: tickStyle,
          },
          y: {
            type: 'linear',
            min: 0,
            title: axisTitle('% of rounds'),
            grid: { color: theme.grid },
            ticks: { ...tickStyle, callback: (v) => `${v}%` },
          },
        },
      },
    })

    return () => {
      chartInstance.current?.destroy()
      chartInstance.current = null
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
      <div style={{ position: 'relative', height: '340px', width: '100%' }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  )
}
