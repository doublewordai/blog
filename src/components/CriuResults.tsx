'use client'

import {useEffect, useId, useMemo, useRef, useState, useSyncExternalStore} from 'react'
import {Chart, registerables} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import {applyChartDefaults, useChartTheme, type ChartTheme} from './chartTheme'
import {
  CRIU_BASELINE_RESULTS,
  CRIU_BLOCK_METRICS,
  CRIU_BLOCK_SIZE_RESULTS,
  type CriuBlockMetric,
  type CriuBlockMetricId,
} from './criuResultsData'
import styles from './CriuResults.module.css'

if (typeof window !== 'undefined') {
  Chart.register(...registerables)
}

type BaselineValueKey =
  | 'checkpointFileOffGiB'
  | 'checkpointFileLz4GiB'
  | 'restoreToFirstTokenOffSeconds'
  | 'restoreToFirstTokenLz4Seconds'

interface BaselineFigureSpec {
  id: string
  title: string
  ariaLabel: string
  caption: string
  axisTitle: string
  unit: string
  decimals: number
  chartMax: number
  offKey: BaselineValueKey
  lz4Key: BaselineValueKey
  tableCaption: string
  reductionHeader: string
}

const CHECKPOINT_FILE_SPEC: BaselineFigureSpec = {
  id: 'checkpoint-file-size',
  title: 'Checkpoint file size',
  ariaLabel:
    'Grouped horizontal bar chart comparing checkpoint file size with CRIU compression off and with 256 KiB LZ4 blocks for five model configurations.',
  caption:
    'Each value is the median of five measurements after one warm-up. With 256 KiB LZ4 blocks, checkpoint file size was 12.5% to 45.5% lower. The exported checkpoint file was not compressed again.',
  axisTitle: 'checkpoint file (GiB)',
  unit: 'GiB',
  decimals: 2,
  chartMax: 90,
  offKey: 'checkpointFileOffGiB',
  lz4Key: 'checkpointFileLz4GiB',
  tableCaption: 'Checkpoint file size by model and compression setting',
  reductionHeader: 'Size reduction',
}

const FIRST_TOKEN_SPEC: BaselineFigureSpec = {
  id: 'restore-to-first-token',
  title: 'Restore to first token',
  ariaLabel:
    'Grouped horizontal bar chart comparing restore to first token with CRIU compression off and with 256 KiB LZ4 blocks for five model configurations.',
  caption:
    'Each value is the median of five measurements after one warm-up. With 256 KiB LZ4 blocks, restore to first token was 7.2% to 44.7% lower.',
  axisTitle: 'restore to first token (seconds)',
  unit: 's',
  decimals: 2,
  chartMax: 225,
  offKey: 'restoreToFirstTokenOffSeconds',
  lz4Key: 'restoreToFirstTokenLz4Seconds',
  tableCaption: 'Restore-to-first-token latency by model and compression setting',
  reductionHeader: 'Latency reduction',
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window === 'undefined'
      ? true
      : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)

    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reducedMotion
}

const subscribeToHydration = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

function useHydrated() {
  return useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot)
}

function useSafeId(prefix: string) {
  const reactId = useId().replace(/:/g, '')
  return `${prefix}-${reactId}`
}

function reductionPercent(before: number, after: number) {
  return ((before - after) / before) * 100
}

function chartColors(theme: ChartTheme) {
  return {
    off: theme.isDark ? 'rgba(190, 190, 190, 0.72)' : 'rgba(80, 80, 80, 0.62)',
    lz4: theme.isDark ? '#ff6868' : '#a00000',
    measured: theme.isDark ? 'rgba(190, 190, 190, 0.68)' : 'rgba(80, 80, 80, 0.58)',
    best: theme.isDark ? '#ff6868' : '#a00000',
  }
}

function exactValues(
  enhanced: boolean,
  children: React.ReactNode,
) {
  if (!enhanced) {
    return (
      <div className={styles.valuesFallback}>
        <div className={styles.valuesFallbackTitle}>Exact values</div>
        {children}
      </div>
    )
  }

  return (
    <details className={styles.valuesDisclosure}>
      <summary>Exact values</summary>
      {children}
    </details>
  )
}

function BaselineTable({spec}: {spec: BaselineFigureSpec}) {
  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <caption>{spec.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">Model</th>
            <th scope="col">Compression off</th>
            <th scope="col">LZ4, 256 KiB</th>
            <th scope="col">{spec.reductionHeader}</th>
          </tr>
        </thead>
        <tbody>
          {CRIU_BASELINE_RESULTS.map((result) => {
            const off = result[spec.offKey]
            const lz4 = result[spec.lz4Key]
            return (
              <tr key={result.model}>
                <th scope="row">{result.model}</th>
                <td>{off.toFixed(spec.decimals)} {spec.unit}</td>
                <td>{lz4.toFixed(spec.decimals)} {spec.unit}</td>
                <td>{reductionPercent(off, lz4).toFixed(1)}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function createBaselineChart(
  canvas: HTMLCanvasElement,
  spec: BaselineFigureSpec,
  theme: ChartTheme,
  reducedMotion: boolean,
) {
  const colors = chartColors(theme)
  const label = (value: number) => `${value.toFixed(spec.decimals)} ${spec.unit}`

  applyChartDefaults(theme)

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: CRIU_BASELINE_RESULTS.map((result) => [...result.chartLabel]),
      datasets: [
        {
          label: 'Compression off',
          data: CRIU_BASELINE_RESULTS.map((result) => result[spec.offKey]),
          backgroundColor: colors.off,
          borderColor: colors.off,
          borderWidth: 0,
          borderRadius: 3,
          borderSkipped: false,
          maxBarThickness: 21,
        },
        {
          label: 'LZ4, 256 KiB',
          data: CRIU_BASELINE_RESULTS.map((result) => result[spec.lz4Key]),
          backgroundColor: colors.lz4,
          borderColor: colors.lz4,
          borderWidth: 0,
          borderRadius: 3,
          borderSkipped: false,
          maxBarThickness: 21,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : {duration: 220, easing: 'easeOutQuart'},
      events: [],
      layout: {padding: {top: 4, right: 52}},
      datasets: {
        bar: {
          barPercentage: 0.84,
          categoryPercentage: 0.72,
        },
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: {
            boxWidth: 12,
            boxHeight: 8,
            color: theme.foreground,
            font: {family: theme.fontFamily, size: 12},
            padding: 14,
            usePointStyle: true,
            pointStyle: 'rectRounded',
          },
        },
        tooltip: {enabled: false},
        datalabels: {
          anchor: 'end',
          align: 'right',
          clamp: true,
          clip: false,
          offset: 4,
          color: theme.foreground,
          font: {family: theme.fontFamily, size: 11, weight: 600},
          formatter: (value: number) => label(value),
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: spec.chartMax,
          border: {display: false},
          grid: {color: theme.grid},
          title: {
            display: true,
            text: spec.axisTitle,
            color: theme.mutedForeground,
            font: {family: theme.fontFamily, size: 11},
          },
          ticks: {
            color: theme.mutedForeground,
            font: {family: theme.fontFamily, size: 11},
            maxTicksLimit: 6,
          },
        },
        y: {
          border: {display: false},
          grid: {display: false},
          ticks: {
            autoSkip: false,
            color: theme.foreground,
            font: {family: theme.fontFamily, size: 11, weight: 500},
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  })
}

function BaselineFigure({spec}: {spec: BaselineFigureSpec}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const enhanced = useHydrated()
  const theme = useChartTheme()
  const reducedMotion = useReducedMotion()
  const titleId = useSafeId(`${spec.id}-title`)
  const captionId = useSafeId(`${spec.id}-caption`)

  useEffect(() => {
    if (!enhanced) return

    const canvas = canvasRef.current
    if (!canvas) return

    chartRef.current?.destroy()
    chartRef.current = createBaselineChart(canvas, spec, theme, reducedMotion)

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [enhanced, reducedMotion, spec, theme])

  return (
    <figure className={styles.figure} aria-labelledby={titleId}>
      <div className={styles.figureTitle} id={titleId}>{spec.title}</div>
      {enhanced && (
        <div className={styles.chartFrame}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={spec.ariaLabel}
            aria-describedby={captionId}
          />
        </div>
      )}
      <figcaption className={styles.caption} id={captionId}>{spec.caption}</figcaption>
      {exactValues(enhanced, <BaselineTable spec={spec} />)}
    </figure>
  )
}

function BlockSizeTable() {
  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <caption>Qwen 3.5 4B results by LZ4 compression block size</caption>
        <thead>
          <tr>
            <th scope="col">Block size</th>
            <th scope="col">Checkpoint file</th>
            <th scope="col">Complete restore</th>
            <th scope="col">Restore to first token</th>
          </tr>
        </thead>
        <tbody>
          {CRIU_BLOCK_SIZE_RESULTS.map((result) => (
            <tr key={result.blockSize}>
              <th scope="row">{result.blockSize}</th>
              <td>{result.checkpointFileGiB.toFixed(3)} GiB</td>
              <td>{result.completeRestoreSeconds.toFixed(2)} s</td>
              <td>{result.restoreToFirstTokenSeconds.toFixed(2)} s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function createBlockSizeChart(
  canvas: HTMLCanvasElement,
  metric: CriuBlockMetric,
  theme: ChartTheme,
  reducedMotion: boolean,
) {
  const colors = chartColors(theme)
  const values = CRIU_BLOCK_SIZE_RESULTS.map((result) => result[metric.dataKey])

  applyChartDefaults(theme)

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: CRIU_BLOCK_SIZE_RESULTS.map((result) => result.blockSize),
      datasets: [
        {
          label: metric.chartTitle,
          data: values,
          backgroundColor: CRIU_BLOCK_SIZE_RESULTS.map((result) =>
            result.blockSize === '1 MiB' ? colors.best : colors.measured),
          borderColor: CRIU_BLOCK_SIZE_RESULTS.map((result) =>
            result.blockSize === '1 MiB' ? colors.best : colors.measured),
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 58,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : {duration: 200, easing: 'easeOutQuart'},
      events: [],
      layout: {padding: {top: 27, right: 8}},
      plugins: {
        legend: {display: false},
        tooltip: {enabled: false},
        datalabels: {
          anchor: 'end',
          align: 'end',
          clamp: true,
          clip: false,
          offset: 3,
          color: theme.foreground,
          font: {family: theme.fontFamily, size: 11, weight: 600},
          formatter: (value: number) => `${value.toFixed(metric.decimals)} ${metric.unit}`,
        },
      },
      scales: {
        x: {
          border: {display: false},
          grid: {display: false},
          ticks: {
            autoSkip: false,
            color: theme.foreground,
            font: {family: theme.fontFamily, size: 11, weight: 500},
          },
        },
        y: {
          beginAtZero: true,
          max: metric.chartMax,
          border: {display: false},
          grid: {color: theme.grid},
          title: {
            display: true,
            text: metric.axisTitle,
            color: theme.mutedForeground,
            font: {family: theme.fontFamily, size: 11},
          },
          ticks: {
            color: theme.mutedForeground,
            font: {family: theme.fontFamily, size: 11},
            maxTicksLimit: 6,
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  })
}

export function CriuBlockSizeResults() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const enhanced = useHydrated()
  const [metricId, setMetricId] = useState<CriuBlockMetricId>('complete-restore')
  const theme = useChartTheme()
  const reducedMotion = useReducedMotion()
  const titleId = useSafeId('criu-block-size-title')
  const captionId = useSafeId('criu-block-size-caption')
  const chartId = useSafeId('criu-block-size-chart')
  const metric = useMemo(
    () => CRIU_BLOCK_METRICS.find((candidate) => candidate.id === metricId) ?? CRIU_BLOCK_METRICS[0],
    [metricId],
  )

  useEffect(() => {
    if (!enhanced) return

    const canvas = canvasRef.current
    if (!canvas) return

    chartRef.current?.destroy()
    chartRef.current = createBlockSizeChart(canvas, metric, theme, reducedMotion)

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [enhanced, metric, reducedMotion, theme])

  return (
    <div className={styles.results}>
      <figure className={styles.figure} aria-labelledby={titleId}>
        <div className={styles.figureTitle} id={titleId}>Qwen 3.5 4B block-size comparison</div>
        {enhanced && (
          <fieldset className={styles.controls} aria-label="Metric shown in the block-size chart">
            {CRIU_BLOCK_METRICS.map((candidate) => (
              <button
                key={candidate.id}
                className={styles.metricButton}
                type="button"
                aria-controls={chartId}
                aria-pressed={candidate.id === metric.id}
                onClick={() => setMetricId(candidate.id)}
              >
                {candidate.buttonLabel}
              </button>
            ))}
          </fieldset>
        )}
        {enhanced && (
          <>
            <p className={styles.liveStatus} aria-live="polite">
              Showing {metric.chartTitle.toLowerCase()} in {metric.unit}.
            </p>
            <div className={`${styles.chartFrame} ${styles.blockChartFrame}`}>
              <canvas
                id={chartId}
                ref={canvasRef}
                role="img"
                aria-label={`Bar chart comparing ${metric.chartTitle.toLowerCase()} for Qwen 3.5 4B with 4 KiB, 256 KiB, 512 KiB, and 1 MiB LZ4 blocks.`}
                aria-describedby={captionId}
              />
            </div>
          </>
        )}
        <figcaption className={styles.caption} id={captionId}>
          Each value is the median of five measurements after one warm-up, with the same limit of 16 decompression threads. Among the four sizes measured on this host, 1 MiB had the lowest value for all three metrics; a different workload or restore path may favour another size.
        </figcaption>
        {exactValues(enhanced, <BlockSizeTable />)}
      </figure>
    </div>
  )
}

export default function CriuResults() {
  return (
    <div className={styles.results} role="group" aria-label="CRIU LZ4 baseline benchmark results">
      <BaselineFigure spec={CHECKPOINT_FILE_SPEC} />
      <BaselineFigure spec={FIRST_TOKEN_SPEC} />
    </div>
  )
}
