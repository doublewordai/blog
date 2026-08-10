/**
 * Medians from the CRIU LZ4 evaluation results. Each configuration has five
 * measurements after one discarded warm-up.
 *
 * Baseline source:
 *   criu-lz4-evaluation/results/paper-final-e1-criu-defaults
 * Block-size source:
 *   criu-lz4-evaluation/results/paper-final-e5-max-threads-block-size
 */

export interface CriuBaselineResult {
  model: string
  chartLabel: string[]
  checkpointFileOffGiB: number
  checkpointFileLz4GiB: number
  restoreToFirstTokenOffSeconds: number
  restoreToFirstTokenLz4Seconds: number
}

export const CRIU_BASELINE_RESULTS: readonly CriuBaselineResult[] = [
  {
    model: 'Qwen 3.5 4B',
    chartLabel: ['Qwen 3.5', '4B'],
    checkpointFileOffGiB: 22.35,
    checkpointFileLz4GiB: 12.174,
    restoreToFirstTokenOffSeconds: 43.263616,
    restoreToFirstTokenLz4Seconds: 23.903611,
  },
  {
    model: 'Qwen 3.5 9B',
    chartLabel: ['Qwen 3.5', '9B'],
    checkpointFileOffGiB: 31.487,
    checkpointFileLz4GiB: 21.214,
    restoreToFirstTokenOffSeconds: 67.199939,
    restoreToFirstTokenLz4Seconds: 51.681601,
  },
  {
    model: 'Qwen 3.5 27B',
    chartLabel: ['Qwen 3.5', '27B'],
    checkpointFileOffGiB: 65.007,
    checkpointFileLz4GiB: 54.683,
    restoreToFirstTokenOffSeconds: 154.846074,
    restoreToFirstTokenLz4Seconds: 136.755266,
  },
  {
    model: 'Qwen 3.6 35B-A3B',
    chartLabel: ['Qwen 3.6', '35B-A3B'],
    checkpointFileOffGiB: 79.392,
    checkpointFileLz4GiB: 68.766,
    restoreToFirstTokenOffSeconds: 202.388973,
    restoreToFirstTokenLz4Seconds: 183.704219,
  },
  {
    model: 'Gemma 4 26B-A4B',
    chartLabel: ['Gemma 4', '26B-A4B'],
    checkpointFileOffGiB: 57.72,
    checkpointFileLz4GiB: 50.532,
    restoreToFirstTokenOffSeconds: 130.304341,
    restoreToFirstTokenLz4Seconds: 120.947662,
  },
]

export interface CriuBlockSizeResult {
  blockSize: string
  checkpointFileGiB: number
  completeRestoreSeconds: number
  restoreToFirstTokenSeconds: number
}

export const CRIU_BLOCK_SIZE_RESULTS: readonly CriuBlockSizeResult[] = [
  {
    blockSize: '4 KiB',
    checkpointFileGiB: 12.958,
    completeRestoreSeconds: 25.912,
    restoreToFirstTokenSeconds: 27.145,
  },
  {
    blockSize: '256 KiB',
    checkpointFileGiB: 12.173,
    completeRestoreSeconds: 22.392,
    restoreToFirstTokenSeconds: 23.624,
  },
  {
    blockSize: '512 KiB',
    checkpointFileGiB: 12.158,
    completeRestoreSeconds: 23.047,
    restoreToFirstTokenSeconds: 24.288,
  },
  {
    blockSize: '1 MiB',
    checkpointFileGiB: 12.152,
    completeRestoreSeconds: 19.818,
    restoreToFirstTokenSeconds: 21.047,
  },
]

export const CRIU_BLOCK_METRICS = [
  {
    id: 'checkpoint-file',
    buttonLabel: 'Checkpoint file',
    chartTitle: 'Checkpoint file size',
    axisTitle: 'checkpoint file (GiB)',
    dataKey: 'checkpointFileGiB',
    unit: 'GiB',
    unitName: 'GiB',
    decimals: 3,
    chartMax: 14,
  },
  {
    id: 'complete-restore',
    buttonLabel: 'Complete restore',
    chartTitle: 'Complete restore',
    axisTitle: 'complete restore (seconds)',
    dataKey: 'completeRestoreSeconds',
    unit: 's',
    unitName: 'seconds',
    decimals: 2,
    chartMax: 30,
  },
  {
    id: 'first-token',
    buttonLabel: 'First token',
    chartTitle: 'Restore to first token',
    axisTitle: 'restore to first token (seconds)',
    dataKey: 'restoreToFirstTokenSeconds',
    unit: 's',
    unitName: 'seconds',
    decimals: 2,
    chartMax: 30,
  },
] as const

export type CriuBlockMetric = (typeof CRIU_BLOCK_METRICS)[number]
export type CriuBlockMetricId = CriuBlockMetric['id']
