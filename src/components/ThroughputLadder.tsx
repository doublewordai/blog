'use client'

import {useRef, useState, useCallback, useEffect} from 'react'

interface Bar {
  label: string
  value: number // output tokens/second
  tooltip?: string
  muted?: boolean // render earlier rungs de-emphasised
}

interface Props {
  bars: Bar[]
  max?: number // shared scale across the post; defaults to largest bar
  unit?: string // default "tok/s"
}

type TooltipState = {
  text: string
  left: number
  top: number
  key: string
} | null

const fmt = (v: number) => v.toLocaleString('en-US')

export default function ThroughputLadder({bars, max: maxProp, unit = 'tok/s'}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>(null)
  const isTouchRef = useRef(false)

  const max = maxProp ?? Math.max(...bars.map((b) => b.value))

  const showTooltip = useCallback((fill: HTMLElement, text: string, key: string) => {
    const container = containerRef.current
    const tipEl = tooltipRef.current
    if (!container || !tipEl) return

    const cRect = container.getBoundingClientRect()
    const fRect = fill.getBoundingClientRect()
    let left = fRect.left - cRect.left + Math.min(fRect.width, 120) / 2
    const top = fRect.bottom - cRect.top + 8

    tipEl.style.display = 'block'
    tipEl.textContent = text
    const tipWidth = tipEl.offsetWidth
    left = Math.max(8, Math.min(left - tipWidth / 2, cRect.width - tipWidth - 8))

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
    <div className="throughput-ladder" ref={containerRef}>
      {bars.map((bar, i) => {
        const pct = (bar.value / max) * 100
        const isLast = i === bars.length - 1
        const tip = bar.tooltip ?? `${bar.label}: ${fmt(bar.value)} ${unit}`
        const key = String(i)
        const isActive = tooltip?.key === key
        const classes = [
          'tl-fill',
          isLast ? 'current' : '',
          bar.muted && !isLast ? 'muted' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <div className="tl-group" key={key}>
            <div className="tl-header">
              <span className="tl-label">{bar.label}</span>
              <span className="tl-value">
                {fmt(bar.value)} <span className="tl-unit">{unit}</span>
              </span>
            </div>
            <div className="tl-track">
              <div
                className={classes}
                style={{width: `${pct}%`, opacity: isActive ? 0.75 : undefined}}
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
            </div>
          </div>
        )
      })}

      <div
        className="tl-tooltip"
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
