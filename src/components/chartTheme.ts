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
}

const FONT_FAMILY = "'Source Sans 3', sans-serif"

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
      fontFamily: FONT_FAMILY,
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
    fontFamily: FONT_FAMILY,
  }
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readTheme)

  useEffect(() => {
    const update = () => setTheme(readTheme())
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    update()
    return () => observer.disconnect()
  }, [])

  return theme
}

export function applyChartDefaults(theme: ChartTheme) {
  Chart.defaults.font.family = theme.fontFamily
  Chart.defaults.font.size = 13
  Chart.defaults.color = theme.foreground
  Chart.defaults.borderColor = theme.grid
}
