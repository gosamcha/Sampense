import {
  ChevronLeft,
  ChevronRight,
  ImageDown,
  Menu,
  SlidersHorizontal,
} from 'lucide-react'
import type { PageName, ThemeColors } from '../types'
import {
  formatDailyHeader,
  formatMonthTitle,
  formatWeekTitle,
} from '../utils/date'

type HeaderProps = {
  page: PageName
  selectedDate: string
  theme: ThemeColors
  onMovePeriod: (amount: number) => void
  onOpenBudget: () => void
  onOpenMenu: () => void
  onCapture?: () => void
}

export default function Header({
  page,
  selectedDate,
  theme,
  onMovePeriod,
  onOpenBudget,
  onOpenMenu,
  onCapture,
}: HeaderProps) {
  const title =
    page === 'daily'
      ? formatDailyHeader(selectedDate)
      : page === 'weekly'
        ? formatWeekTitle(selectedDate)
        : formatMonthTitle(selectedDate)

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-period">
          <button
            type="button"
            className="icon-button muted"
            onClick={() => onMovePeriod(-1)}
            aria-label="Previous period"
          >
            <ChevronLeft size={24} strokeWidth={3} />
          </button>

          <div className="period-title" style={{ color: theme.primaryBg }}>
            {title}
          </div>

          <button
            type="button"
            className="icon-button muted"
            onClick={() => onMovePeriod(1)}
            aria-label="Next period"
          >
            <ChevronRight size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="header-actions">
          {onCapture ? (
            <button
              type="button"
              className="icon-button"
              onClick={onCapture}
              aria-label="Save monthly image"
            >
              <ImageDown size={21} strokeWidth={2.7} />
            </button>
          ) : (
            <span className="icon-button header-action-placeholder" aria-hidden="true" />
          )}

          <button
            type="button"
            className="icon-button"
            onClick={onOpenBudget}
            aria-label="Budget and categories"
          >
            <SlidersHorizontal size={21} strokeWidth={2.7} />
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={onOpenMenu}
            aria-label="Menu"
          >
            <Menu size={22} strokeWidth={2.8} />
          </button>
        </div>
      </div>
    </header>
  )
}
