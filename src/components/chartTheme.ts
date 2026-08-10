'use client'

import {useEffect, useState} from 'react'
import {Chart} from 'chart.js'

export interface ChartTheme {
  isDark: boolean
  foreground: string
  mutedForeground: string
  grid: string
  unusedFill: string
  buttonActiveBg: string
  buttonActiveText: string
  buttonInactiveText: string
  fontFamily: string
  fontSize: number
}

// next/font registers Source Sans 3 under a hashed family name. Resolve the
// generated stack from its CSS variable; the literal is an SSR/failure fallback.
const FONT_FALLBACK = "'Source Sans 3', sans-serif"

function fontFamily(): string {
  if (typeof document === 'undefined') return FONT_FALLBACK
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--font-sans')
    .trim() || FONT_FALLBACK
}

function fontSize(): number {
  if (typeof document === 'undefined') return 16
  const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return Math.max(12, rootSize - 4)
}

function readTheme(): ChartTheme {
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark'
  if (isDark) {
    return {
      isDark: true,
      foreground: '#f0f0f0',
      mutedForeground: 'rgba(240, 240, 240, 0.65)',
      grid: 'rgba(240, 240, 240, 0.12)',
      unusedFill: 'rgba(240, 240, 240, 0.1)',
      buttonActiveBg: 'rgba(240, 240, 240, 0.12)',
      buttonActiveText: '#f0f0f0',
      buttonInactiveText: 'rgba(240, 240, 240, 0.45)',
      fontFamily: fontFamily(),
      fontSize: fontSize(),
    }
  }
  return {
    isDark: false,
    foreground: '#000000',
    mutedForeground: 'rgba(0, 0, 0, 0.65)',
    grid: 'rgba(0, 0, 0, 0.1)',
    unusedFill: '#e5e7eb',
    buttonActiveBg: 'rgba(0, 0, 0, 0.08)',
    buttonActiveText: '#000000',
    buttonInactiveText: 'rgba(0, 0, 0, 0.4)',
    fontFamily: fontFamily(),
    fontSize: fontSize(),
  }
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readTheme)

  useEffect(() => {
    const update = () => setTheme(readTheme())
    const observer = new MutationObserver(update)
    const desktopText = window.matchMedia('(min-width: 1280px)')
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    desktopText.addEventListener('change', update)
    update()
    return () => {
      observer.disconnect()
      desktopText.removeEventListener('change', update)
    }
  }, [])

  return theme
}

export function applyChartDefaults(theme: ChartTheme) {
  Chart.defaults.font.family = theme.fontFamily
  Chart.defaults.font.size = 13
  Chart.defaults.color = theme.foreground
  Chart.defaults.borderColor = theme.grid
}
