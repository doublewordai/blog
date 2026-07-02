'use client'

import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { useChartTheme, applyChartDefaults } from './chartTheme'
import {
  EXPERT_POPULARITY_DATASETS,
  EXPERT_POPULARITY_MODELS,
  EXPERT_POPULARITY_DEFAULT_MODEL,
  EXPERT_POPULARITY_DEFAULT,
} from './expertPopularityData'

if (typeof window !== 'undefined') {
  Chart.register(...registerables)
}

// Global expert popularity: the share of routed tokens each expert receives,
// ranked most -> least popular and averaged over the 40 layers. The router is
// far from balanced, and the skew is why the "batch of N" null in the
// run-vs-batch chart sits below the uniform coupon-collector ceiling: a real
// batch draws these popular experts again and again, so it touches fewer
// distinct experts than uniform predicts. Selectable across HumanEval and
// every SPEED-Bench qualitative category -- see expertPopularityData.ts for
// provenance. The shape (roughly exponential decay in rank, not a power law)
// and the popular/unpopular expert set are consistent across all of them;
// only the degree of skew shifts by domain.

const UNIFORM = 0.391 // 1/256, each expert's fair share of routed tokens, in %
const NUM_LAYERS: Record<string, number> = { qwen: 40, 'deepseek-v4-flash': 43 }
const PER_LAYER_URL = '/blog-data/speculating-on-the-margin/expert-popularity-per-layer.json'

export default function ExpertPopularity() {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const theme = useChartTheme()
  const [modelId, setModelId] = useState(EXPERT_POPULARITY_DEFAULT_MODEL)
  const [datasetKey, setDatasetKey] = useState(EXPERT_POPULARITY_DEFAULT)
  const [layer, setLayer] = useState<'mean' | number>('mean')
  // lazily fetched: per-layer curves are ~1MB (40 layers x 256 experts x 13
  // datasets), too large to inline like the layer-averaged data above.
  const [perLayerData, setPerLayerData] = useState<Record<string, number[][]> | null>(null)
  const [perLayerLoading, setPerLayerLoading] = useState(false)

  const onLayerChange = (value: string) => {
    const next = value === 'mean' ? 'mean' : Number(value)
    setLayer(next)
    if (next !== 'mean' && !perLayerData && !perLayerLoading) {
      setPerLayerLoading(true)
      fetch(PER_LAYER_URL)
        .then((r) => r.json())
        .then((data) => setPerLayerData(data))
        .catch(() => setPerLayerLoading(false))
    }
  }

  const activeModel = EXPERT_POPULARITY_MODELS.find((m) => m.id === modelId) ?? EXPERT_POPULARITY_MODELS[0]

  const onModelChange = (value: string) => {
    setModelId(value)
    const next = EXPERT_POPULARITY_MODELS.find((m) => m.id === value)
    const firstKey = next?.groups[0]?.keys[0]
    if (firstKey) setDatasetKey(firstKey)
    setLayer('mean')
  }

  useEffect(() => {
    if (!chartRef.current) return
    chartInstance.current?.destroy()
    applyChartDefaults(theme)

    const POP =
      layer !== 'mean' && perLayerData?.[datasetKey]
        ? perLayerData[datasetKey][layer]
        : EXPERT_POPULARITY_DATASETS[datasetKey].pop

    const aboveC = `hsl(220, 70%, ${theme.isDark ? 60 : 48}%)` // pulls more than its share
    const belowC = `hsl(220, 28%, ${theme.isDark ? 42 : 78}%)` // starved tail

    const axisTitle = (text: string) => ({
      display: true,
      text,
      color: theme.mutedForeground,
      font: { family: theme.fontFamily },
    })
    const tickStyle = { color: theme.mutedForeground, font: { family: theme.fontFamily } }
    const showTicks = [0, 32, 64, 128, 192, 255]

    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: POP.map((_, i) => i),
        datasets: [
          {
            label: 'share of routed tokens',
            data: POP,
            backgroundColor: POP.map((v) => (v >= UNIFORM ? aboveC : belowC)),
            borderWidth: 0,
            barPercentage: 1.0,
            categoryPercentage: 1.0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10, right: 12 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => (items.length ? `expert rank ${items[0].label}` : ''),
              label: (ctx) =>
                `  ${(ctx.parsed.y as number).toFixed(2)}%  (${((ctx.parsed.y as number) / UNIFORM).toFixed(1)}x uniform)`,
            },
          },
        },
        scales: {
          x: {
            title: axisTitle('expert rank (most -> least popular, of 256)'),
            grid: { display: false },
            ticks: {
              ...tickStyle,
              autoSkip: false,
              maxRotation: 0,
              callback: (_v, i) => (showTicks.includes(i) ? `${i}` : ''),
            },
          },
          y: {
            min: 0,
            title: axisTitle('share of routed tokens (%)'),
            grid: { color: theme.grid },
            ticks: { ...tickStyle, callback: (v) => `${v}%` },
          },
        },
      },
      plugins: [
        {
          // dashed uniform reference line (each expert's fair share)
          id: 'uniform',
          afterDatasetsDraw(chart) {
            const { ctx, scales, chartArea } = chart
            const y = scales.y.getPixelForValue(UNIFORM)
            ctx.save()
            ctx.strokeStyle = theme.mutedForeground
            ctx.lineWidth = 1
            ctx.setLineDash([5, 4])
            ctx.beginPath()
            ctx.moveTo(chartArea.left, y)
            ctx.lineTo(chartArea.right, y)
            ctx.stroke()
            ctx.setLineDash([])
            ctx.font = `11px ${theme.fontFamily}`
            ctx.fillStyle = theme.mutedForeground
            ctx.textAlign = 'right'
            ctx.fillText('uniform', chartArea.right - 4, y - 5)
            ctx.restore()
          },
        },
      ],
    })

    return () => {
      chartInstance.current?.destroy()
      chartInstance.current = null
    }
  }, [theme, datasetKey, layer, perLayerData])

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <select
          value={layer === 'mean' ? 'mean' : String(layer)}
          onChange={(e) => onLayerChange((e.target as HTMLSelectElement).value)}
          style={selectStyle}
        >
          <option value="mean">mean across layers</option>
          {Array.from({ length: NUM_LAYERS[modelId] ?? 40 }, (_, i) => (
            <option key={i} value={String(i)}>layer {i}</option>
          ))}
        </select>
        <select
          value={modelId}
          onChange={(e) => onModelChange((e.target as HTMLSelectElement).value)}
          style={selectStyle}
        >
          {EXPERT_POPULARITY_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <select
          value={datasetKey}
          onChange={(e) => setDatasetKey((e.target as HTMLSelectElement).value)}
          style={selectStyle}
        >
          {activeModel.groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.keys.map((key) => (
                <option key={key} value={key}>{EXPERT_POPULARITY_DATASETS[key].label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div style={{ position: 'relative', height: '360px', width: '100%' }}>
        <canvas ref={chartRef} />
      </div>
      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: theme.mutedForeground, marginTop: '0.25rem' }}>
        {layer !== 'mean'
          ? `layer ${layer} of ${NUM_LAYERS[modelId] ?? 40}${!perLayerData ? ' (loading…)' : ''}`
          : ''}
      </div>
    </div>
  )
}
