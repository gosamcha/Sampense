import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, seedInitialData } from './db'
import type { PageName, ThemeColors } from './types'
import { DEFAULT_THEME, THEME_KEYS } from './theme'
import {
  addDays,
  addMonths,
  formatDateLocal,
} from './utils/date'
import Header from './components/Header'
import PageTabs from './components/PageTabs'
import BudgetDrawer from './components/BudgetDrawer'
import MenuDrawer from './components/MenuDrawer'
import DailyPage from './pages/DailyPage'
import WeeklyPage from './pages/WeeklyPage'
import MonthlyPage from './pages/MonthlyPage'

const pageOrder: PageName[] = ['daily', 'weekly', 'monthly']

function App() {
  const [page, setPage] = useState<PageName>('daily')
  const [selectedDate, setSelectedDate] = useState(formatDateLocal())
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [captureRequestToken, setCaptureRequestToken] = useState(0)
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)

  useEffect(() => {
    void seedInitialData()
  }, [])

  const categories =
    useLiveQuery(
      () => db.categories.orderBy('order').toArray(),
      [],
    ) ?? []

  const theme: ThemeColors =
    useLiveQuery(async () => {
      const [primaryBg, primaryText, income, expense] = await Promise.all([
        db.settings.get(THEME_KEYS.primaryBg),
        db.settings.get(THEME_KEYS.primaryText),
        db.settings.get(THEME_KEYS.income),
        db.settings.get(THEME_KEYS.expense),
      ])

      return {
        primaryBg: primaryBg?.value ?? DEFAULT_THEME.primaryBg,
        primaryText: primaryText?.value ?? DEFAULT_THEME.primaryText,
        income: income?.value ?? DEFAULT_THEME.income,
        expense: expense?.value ?? DEFAULT_THEME.expense,
      }
    }, []) ?? DEFAULT_THEME

  function movePeriod(amount: number) {
    if (page === 'daily') {
      setSelectedDate((date) => addDays(date, amount))
      return
    }
    if (page === 'weekly') {
      setSelectedDate((date) => addDays(date, amount * 7))
      return
    }
    setSelectedDate((date) => addMonths(date, amount))
  }

  function movePage(amount: number) {
    const index = pageOrder.indexOf(page)
    const next = index + amount
    if (next < 0 || next >= pageOrder.length) return
    setPage(pageOrder[next])
  }

  function openDaily(date: string) {
    setSelectedDate(date)
    setPage('daily')
  }

  function onTouchStart(event: React.TouchEvent) {
    if (budgetOpen || menuOpen) return
    swipeStartX.current = event.touches[0]?.clientX ?? null
    swipeStartY.current = event.touches[0]?.clientY ?? null
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (swipeStartX.current === null || swipeStartY.current === null) return

    const endX = event.changedTouches[0]?.clientX ?? swipeStartX.current
    const endY = event.changedTouches[0]?.clientY ?? swipeStartY.current
    const deltaX = endX - swipeStartX.current
    const deltaY = endY - swipeStartY.current

    swipeStartX.current = null
    swipeStartY.current = null

    if (Math.abs(deltaX) < 70 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) {
      return
    }

    movePage(deltaX < 0 ? 1 : -1)
  }

  return (
    <main
      className="sampense-app"
      style={
        {
          '--theme': theme.primaryBg,
          '--theme-text': theme.primaryText,
          '--income': theme.income,
          '--expense': theme.expense,
        } as React.CSSProperties
      }
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Header
        page={page}
        selectedDate={selectedDate}
        theme={theme}
        onMovePeriod={movePeriod}
        onOpenBudget={() => setBudgetOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
        onCapture={
          page === 'monthly'
            ? () => setCaptureRequestToken((value) => value + 1)
            : undefined
        }
      />

      <PageTabs page={page} theme={theme} onChange={setPage} />

      <div className="app-body">
        {page === 'daily' && (
          <DailyPage
            selectedDate={selectedDate}
            categories={categories}
            theme={theme}
          />
        )}

        {page === 'weekly' && (
          <WeeklyPage
            selectedDate={selectedDate}
            categories={categories}
            theme={theme}
            onOpenDaily={openDaily}
          />
        )}

        {page === 'monthly' && (
          <MonthlyPage
            selectedDate={selectedDate}
            categories={categories}
            theme={theme}
            captureRequestToken={captureRequestToken}
            onOpenDaily={openDaily}
          />
        )}
      </div>

      {budgetOpen && (
        <BudgetDrawer
          categories={categories}
          theme={theme}
          onClose={() => setBudgetOpen(false)}
        />
      )}

      {menuOpen && (
        <MenuDrawer
          theme={theme}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </main>
  )
}

export default App
