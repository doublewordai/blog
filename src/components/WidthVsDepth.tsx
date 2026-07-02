'use client'

import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { useChartTheme, applyChartDefaults } from './chartTheme'
import {
  WIDTH_VS_DEPTH_DATASETS,
  WIDTH_VS_DEPTH_MODELS,
  WIDTH_VS_DEPTH_DEFAULT_MODEL,
  WIDTH_VS_DEPTH_DEFAULT,
} from './widthVsDepthData'

if (typeof window !== 'undefined') {
  Chart.register(...registerables)
}

// Two ways a single verify forward gets N token-positions: a BATCH of N
// sequences (one decode token each, "width") or one sequence speculating a RUN
// of N ("depth"). Both pay ~the same MoE weight read; the run activates fewer
// distinct experts, because consecutive tokens route locally. The batch curve is
// the real-popularity null (it draws real routings), so the batch-to-CC gap is
// popularity skew and the batch-to-run gap is the locality. Coupon-collector is
// the old independent-uniform idealisation, a dashed reference ceiling (closed
// form per model's top-k; doesn't change with the dataset selector).
// Inline data is the mean across layers; picking a single layer lazily fetches
// the per-layer curves (early/late layers route quite differently -- same
// pattern as ExpertPopularity's layer selector). Model/dataset selectable
// across Qwen (HumanEval + every SPEED-Bench qualitative category) and
// DeepSeek-V4-Flash (HumanEval, MTP num_steps=3, so its run stops at N=4) --
// see widthVsDepthData.ts for provenance.

const PER_LAYER_URL = '/blog-data/speculating-on-the-margin/width-vs-depth-per-layer.json'

type PerLayer = Record<string, { depth: number[][]; width: number[][] }>

export default function WidthVsDepth() {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const theme = useChartTheme()
  const [modelId, setModelId] = useState(WIDTH_VS_DEPTH_DEFAULT_MODEL)
  const [datasetKey, setDatasetKey] = useState(WIDTH_VS_DEPTH_DEFAULT)
  const [layer, setLayer] = useState<'mean' | number>('mean')
  const [perLayerData, setPerLayerData] = useState<PerLayer | null>(null)
  const [perLayerLoading, setPerLayerLoading] = useState(false)

  const activeModel =
    WIDTH_VS_DEPTH_MODELS.find((m) => m.id === modelId) ?? WIDTH_VS_DEPTH_MODELS[0]

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

  const onModelChange = (value: string) => {
    setModelId(value)
    const next = WIDTH_VS_DEPTH_MODELS.find((m) => m.id === value)
    const firstKey = next?.groups[0]?.keys[0]
    if (firstKey) setDatasetKey(firstKey)
    setLayer('mean')
  }

  useEffect(() => {
    if (!chartRef.current) return
    chartInstance.current?.destroy()
    applyChartDefaults(theme)

    const N = activeModel.nList
    const pts = (a: number[]) => a.map((y, i) => ({ x: N[i], y }))
    const ds = WIDTH_VS_DEPTH_DATASETS[datasetKey]
    const perLayer = layer !== 'mean' ? perLayerData?.[datasetKey] : undefined
    const DEPTH = perLayer ? perLayer.depth[layer as number] : ds.depth
    const WIDTH = perLayer ? perLayer.width[layer as number] : ds.width

    const depthHue = 220
    const widthHue = 28
    const depthC = `hsl(${depthHue}, 70%, ${theme.isDark ? 65 : 45}%)` // run = the hero
    const widthC = `hsl(${widthHue}, 80%, ${theme.isDark ? 62 : 48}%)` // batch = the null

    const axisTitle = (text: string) => ({
      display: true,
      text,
      color: theme.mutedForeground,
      font: { family: theme.fontFamily },
    })
    const tickStyle = { color: theme.mutedForeground, font: { family: theme.fontFamily } }
    const lineDS = (
      label: string,
      data: { x: number; y: number }[],
      color: string,
      opts: Record<string, unknown> = {}
    ) => ({
      label,
      data,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0.25,
      ...opts,
    })

    const xMax = N[N.length - 1]
    const xTicks = xMax > 4 ? [1, 2, 4, 8, 12, 16] : N
    const ccMax = activeModel.cc[activeModel.cc.length - 1]
    const yMax = Math.ceil((ccMax * 1.06) / 4) * 4

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        datasets: [
          lineDS('depth: run of N', pts(DEPTH), depthC, { borderWidth: 2.5 }),
          lineDS('width: batch of N', pts(WIDTH), widthC),
          lineDS('coupon-collector', pts(activeModel.cc), theme.mutedForeground, {
            borderWidth: 1.5,
            borderDash: [5, 4],
          }),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        layout: { padding: { top: 10, right: 70 } },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 14,
              boxHeight: 2,
              color: theme.foreground,
              font: { family: theme.fontFamily },
            },
          },
          tooltip: {
            callbacks: {
              title: (items) => (items.length ? `N = ${items[0].parsed.x} positions` : ''),
              label: (ctx) =>
                `  ${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(1)} experts/layer`,
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: 1,
            max: xMax,
            title: axisTitle('N (token-positions in one verify forward)'),
            grid: { color: theme.grid },
            afterBuildTicks: (axis) => {
              axis.ticks = xTicks.map((v) => ({ value: v }))
            },
            ticks: { ...tickStyle, callback: (v) => `${v}` },
          },
          y: {
            type: 'linear',
            min: 0,
            max: yMax,
            title: axisTitle('distinct experts / layer (of 256)'),
            grid: { color: theme.grid },
            ticks: { ...tickStyle, stepSize: yMax > 60 ? 20 : 4 },
          },
        },
      },
    })

    return () => {
      chartInstance.current?.destroy()
      chartInstance.current = null
    }
  }, [theme, datasetKey, modelId, layer, perLayerData])

  // Fixed width from the longest dataset label across ALL models, so the
  // select doesn't resize when the model switch swaps its option list.
  const datasetSelectWidth = `${
    Math.max(...Object.values(WIDTH_VS_DEPTH_DATASETS).map((d) => d.label.length)) + 4
  }ch`
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
          {Array.from({ length: activeModel.numLayers }, (_, i) => (
            <option key={i} value={String(i)}>layer {i}</option>
          ))}
        </select>
        <select
          value={modelId}
          onChange={(e) => onModelChange((e.target as HTMLSelectElement).value)}
          style={selectStyle}
        >
          {WIDTH_VS_DEPTH_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <select
          value={datasetKey}
          onChange={(e) => setDatasetKey((e.target as HTMLSelectElement).value)}
          style={{ ...selectStyle, width: datasetSelectWidth }}
        >
          {activeModel.groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.keys.map((key) => (
                <option key={key} value={key}>{WIDTH_VS_DEPTH_DATASETS[key].label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div style={{ position: 'relative', height: '420px', width: '100%' }}>
        <canvas ref={chartRef} />
      </div>
      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: theme.mutedForeground, marginTop: '0.25rem' }}>
        {layer !== 'mean'
          ? `layer ${layer} of ${activeModel.numLayers}${!perLayerData ? ' (loading…)' : ''}`
          : ''}
      </div>
    </div>
  )
}
