// Per-dataset acceptance aggregates for AcceptLengthHist + AcceptJointHeatmap,
// regenerated from the canonical published calibration banks
// (Doubleword/specdec-calibration: speedbench + humaneval, drafters
// mtp and dflash@42d3b34d) by the accept_by_category.py aggregation script.
// hist[k] = % of rounds committing exactly k draft tokens; heat[actual][predicted]
// = % of rounds, predicted accept = round(∑_d ∏_{k≤d} conf_k).

export const ACCEPTANCE_URL = '/blog-data/speculating-on-the-margin/acceptance-by-dataset.json'

export interface AcceptanceEntry {
  nRounds: number
  hist: number[]
  heat: number[][]
  corr: number
}

export interface AcceptanceData {
  mtp: { width: number; datasets: Record<string, AcceptanceEntry> }
  dflash: { width: number; datasets: Record<string, AcceptanceEntry> }
}

export const ACCEPTANCE_DEFAULT = 'speedbench/all'

export const ACCEPTANCE_GROUPS: { label: string; options: { key: string; label: string }[] }[] = [
  {
    label: 'SPEED-Bench (qualitative)',
    options: [
      { key: 'speedbench/all', label: 'SPEED-Bench -- all categories' },
      { key: 'speedbench/coding', label: 'SPEED-Bench -- coding' },
      { key: 'speedbench/writing', label: 'SPEED-Bench -- writing' },
      { key: 'speedbench/qa', label: 'SPEED-Bench -- qa' },
      { key: 'speedbench/rag', label: 'SPEED-Bench -- rag' },
      { key: 'speedbench/math', label: 'SPEED-Bench -- math' },
      { key: 'speedbench/reasoning', label: 'SPEED-Bench -- reasoning' },
      { key: 'speedbench/stem', label: 'SPEED-Bench -- stem' },
      { key: 'speedbench/humanities', label: 'SPEED-Bench -- humanities' },
      { key: 'speedbench/summarization', label: 'SPEED-Bench -- summarization' },
      { key: 'speedbench/multilingual', label: 'SPEED-Bench -- multilingual' },
      { key: 'speedbench/roleplay', label: 'SPEED-Bench -- roleplay' },
    ],
  },
  { label: 'HumanEval', options: [{ key: 'humaneval', label: 'HumanEval' }] },
]

let promise: Promise<AcceptanceData> | null = null

export function loadAcceptanceData(): Promise<AcceptanceData> {
  if (!promise) {
    promise = fetch(ACCEPTANCE_URL).then((r) => {
      if (!r.ok) throw new Error(`acceptance data: ${r.status}`)
      return r.json()
    })
  }
  return promise
}
