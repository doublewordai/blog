'use client'

import {useRef, useState, useCallback, useEffect, type CSSProperties} from 'react'

interface Row {
  label: string
  measured: number
  floor?: number
  kind: 'memory' | 'compute' | 'overhead' | 'mixed'
  tooltip?: string
}

interface Props {
  rows: Row[]
  unit?: string
  maxValue?: number
}

const KIND_COLORS: Record<string, string> = {
  memory: '#3e6fa8',
  compute: '#8a5aa8',
  overhead: '#c07830',
  mixed: '#7a8a7a',
}

const KIND_LABELS: Record<string, string> = {
  memory: 'should be memory bound',
  compute: 'should be compute bound',
  overhead: 'overhead / latency',
  mixed: 'not characterized',
}

type TooltipState = {
  text: string
  left: number
  top: number
  key: string
} | null

export default function RooflineBreakdown({rows, unit = 'ms', maxValue: maxValueProp}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>(null)
  const isTouchRef = useRef(false)

  const maxValue = maxValueProp ?? Math.max(...rows.map((r) => r.measured))
  const kindsPresent = [...new Set(rows.map((r) => r.kind))]

  const showTooltip = useCallback((mark: HTMLElement, text: string, key: string) => {
    const container = containerRef.current
    const tipEl = tooltipRef.current
    if (!container || !tipEl) return

    const cRect = container.getBoundingClientRect()
    const mRect = mark.getBoundingClientRect()
    let left = mRect.left - cRect.left + mRect.width / 2
    const top = mRect.bottom - cRect.top + 6

    tipEl.style.display = 'block'
    tipEl.textContent = text
    const w = tipEl.offsetWidth
    left = Math.max(8, Math.min(left - w / 2, cRect.width - w - 8))

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
    <div className="roofline-breakdown" ref={containerRef}>
      {rows.map((row, i) => {
        const color = KIND_COLORS[row.kind]
        const barPct = (row.measured / maxValue) * 100
        const floorPct = row.floor ? (row.floor / row.measured) * 100 : 0
        const tip =
          row.tooltip ??
          `${row.label}: ${row.measured} ${unit}` +
            (row.floor ? `, roofline floor ${row.floor} ${unit}` : '')
        const key = String(i)
        return (
          <div
            className="rb-row"
            key={key}
            onMouseEnter={(e) => {
              if (!isTouchRef.current) showTooltip(e.currentTarget, tip, key)
            }}
            onMouseLeave={() => {
              if (!isTouchRef.current) hideTooltip()
            }}
            onTouchStart={(e) => {
              isTouchRef.current = true
              e.preventDefault()
              if (tooltip?.key === key) hideTooltip()
              else showTooltip(e.currentTarget, tip, key)
            }}
          >
            <span className="rb-label">{row.label}</span>
            <div className="rb-track">
              <div
                className="rb-bar"
                style={{width: `${barPct}%`, '--rb-color': color} as CSSProperties}
              >
                {row.floor ? <div className="rb-floor" style={{width: `${floorPct}%`}} /> : null}
              </div>
            </div>
            <span className="rb-value">
              {row.measured.toFixed(1)} {unit}
            </span>
          </div>
        )
      })}

      <div className="rb-legend">
        {kindsPresent.map((kind) => (
          <div className="rb-legend-item" key={kind}>
            <span className="rb-swatch" style={{backgroundColor: KIND_COLORS[kind]}} />
            <span className="rb-legend-label">{KIND_LABELS[kind]}</span>
          </div>
        ))}
        <div className="rb-legend-item rb-legend-key">
          <span className="rb-swatch rb-swatch-duo">
            <span className="rb-swatch-solid" />
            <span className="rb-swatch-pale" />
          </span>
          <span className="rb-legend-label">solid = roofline floor, pale = above it</span>
        </div>
      </div>

      <div
        className="rb-tooltip"
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
