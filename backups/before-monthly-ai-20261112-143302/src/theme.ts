import type { ThemeColors } from './types'

export const DEFAULT_THEME: ThemeColors = {
  primaryBg: '#bdbbf0',
  primaryText: '#ffffff',
  income: '#7db79d',
  expense: '#d98b8b',
}

export const THEME_KEYS = {
  primaryBg: 'theme.primaryBg',
  primaryText: 'theme.primaryText',
  income: 'theme.income',
  expense: 'theme.expense',
} as const
