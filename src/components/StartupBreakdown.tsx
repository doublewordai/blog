'use client'

import {useRef, useState, useCallback, useEffect} from 'react'

interface Phase {
  name: string
  seconds: number
  tooltip?: string
}

interface Bar {
  label: string
  phases: Phase[]
}

interface Props {
  bars: Bar[]
  maxSeconds?: number
  showLegend?: boolean
}

const COLORS: Record<string, string> = {
  'Container start': '#7a8a7a',
  'Python imports': '#5b7b9a',
  'HF config + tokenizer': '#6b9aaa',
  'Weight loading': '#8faa6e',
  'FlashInfer autotune + DeepGEMM': '#c4956a',
  'FlashInfer autotune': '#c4956a',
  'CUDA graph capture': '#a07eb5',
  'Server warmup': '#cc7e7e',
  'Container setup': '#7a8a7a',
  'CRIU process restore': '#6b8a9a',
  'CRIU + CUDA plugin': '#6b8a9a',
  'CUDA plugin': '#a07eb5',
  'Weight reload': '#8faa6e',
  'Wake + reload': '#8faa6e',
}

type TooltipState = {
  text: string
  left: number
  top: number
  key: string
} | null

export default function StartupBreakdown({bars, maxSeconds: maxSecondsProp, showLegend = true}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>(null)
  const isTouchRef = useRef(false)

  const hasFractionalTiming = bars.some((bar) =>
    bar.phases.some((phase) => !Number.isInteger(phase.seconds))
  )

  const formatSeconds = (seconds: number) =>
    hasFractionalTiming ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`

  const maxSeconds =
    maxSecondsProp ??
    Math.max(...bars.map((b) => b.phases.reduce((sum, p) => sum + p.seconds, 0)))

  const allPhaseNames = Array.from(new Set(bars.flatMap((b) => b.phases.map((p) => p.name))))

  const showTooltip = useCallback((segment: HTMLElement, text: string, key: string) => {
    const container = containerRef.current
    const tipEl = tooltipRef.current
    if (!container || !tipEl) return

    const containerRect = container.getBoundingClientRect()
    const segmentRect = segment.getBoundingClientRect()

    let left = segmentRect.left - containerRect.left + segmentRect.width / 2
    const top = segmentRect.bottom - containerRect.top + 8

    // Temporarily render off-screen to measure width
    tipEl.style.display = 'block'
    tipEl.textContent = text
    const tipWidth = tipEl.offsetWidth
    left = Math.max(8, Math.min(left - tipWidth / 2, containerRect.width - tipWidth - 8))

    setTooltip({text, left, top, key})
  }, [])

  const hideTooltip = useCallback(() => {
    setTooltip(null)
  }, [])

  useEffect(() => {
    const onDocTouch = (e: Event) => {
      const container = containerRef.current
      if (container && !container.contains(e.target as Node)) hideTooltip()
    }
    document.addEventListener('touchstart', onDocTouch)
    document.addEventListener('click', onDocTouch)
    return () => {
      document.removeEventListener('touchstart', onDocTouch)
      document.removeEventListener('click', onDocTouch)
    }
  }, [hideTooltip])

  return (
    <div className="startup-breakdown" ref={containerRef}>
      {bars.map((bar, barIdx) => {
        const total = bar.phases.reduce((sum, p) => sum + p.seconds, 0)
        return (
          <div className="bar-group" key={barIdx}>
            <div className="bar-header">
              <span className="bar-label">{bar.label}</span>
              <span className="bar-total">{formatSeconds(total)}</span>
            </div>
            <div className="bar-row">
              <div className="bar-track">
                {bar.phases.map((phase, phaseIdx) => {
                  const pct = (phase.seconds / maxSeconds) * 100
                  const color = COLORS[phase.name] ?? '#999'
                  const tip = phase.tooltip ?? `${phase.name}: ${phase.seconds}s`
                  const key = `${barIdx}-${phaseIdx}`
                  const isActive = tooltip?.key === key
                  return (
                    <div
                      key={key}
                      className="phase-segment"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                        opacity: isActive ? 0.75 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isTouchRef.current) showTooltip(e.currentTarget, tip, key)
                      }}
                      onMouseLeave={() => {
                        if (!isTouchRef.current) hideTooltip()
                      }}
                      onTouchStart={(e) => {
                        isTouchRef.current = true
                        e.preventDefault()
                        if (isActive) hideTooltip()
                        else showTooltip(e.currentTarget, tip, key)
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}

      {showLegend && (
        <div className="legend">
          {allPhaseNames.map((name) => {
            const color = COLORS[name] ?? '#999'
            return (
              <div className="legend-item" key={name}>
                <span className="legend-swatch" style={{backgroundColor: color}} />
                <span className="legend-label">{name}</span>
              </div>
            )
          })}
        </div>
      )}

      <div
        className="phase-tooltip"
        ref={tooltipRef}
        style={{
          display: tooltip ? 'block' : 'none',
          left: tooltip?.left,
          top: tooltip?.top,
        }}
      >
        {tooltip?.text}
      </div>
    </div>
  )
}
